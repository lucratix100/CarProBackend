import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Rental from '#models/rental'
import Vehicle from '#models/vehicle'
import Client from '#models/client'
import RentalService from '#services/rental_service'
import RentalContractService from '#services/rental_contract_service'
import { rentalFinancials } from '#services/finance_service'
import RentalTransformer from '#transformers/rental_transformer'
import {
  cancelRentalValidator,
  createRentalValidator,
  extendRentalValidator,
  rejectRentalValidator,
  updateRentalValidator,
} from '#validators/rental'
import PermissionService from '#services/permission_service'
import AuditService, { diffValues, pickAuditFields } from '#services/audit_service'
import ValidationService, { pendingValidationResponse } from '#services/validation_service'

const RENTAL_AUDIT_FIELDS = [
  'vehicleId',
  'clientId',
  'startDate',
  'endDate',
  'dailyPrice',
  'amountPaid',
  'status',
  'notes',
] as const

export default class RentalsController {
  #service = new RentalService()
  #contractService = new RentalContractService()
  #permissions = new PermissionService()
  #audit = new AuditService()
  #validation = new ValidationService()

  async #findScoped(id: number | string, agencyId: number) {
    return Rental.query().where('id', id).where('agencyId', agencyId).firstOrFail()
  }

  async #assertVehicleInAgency(vehicleId: number, agencyId: number) {
    const vehicle = await Vehicle.query().where('id', vehicleId).where('agencyId', agencyId).first()
    if (!vehicle) {
      throw new Exception('Véhicule introuvable pour cette agence.', {
        status: 422,
        code: 'E_VEHICLE_AGENCY',
      })
    }
    return vehicle
  }

  async #assertClientInAgency(clientId: number, agencyId: number) {
    const client = await Client.query()
      .where('id', clientId)
      .where((q) => {
        q.where('agencyId', agencyId).orWhere((sub) => {
          sub.whereNull('agencyId').where('source', 'marketplace')
        })
      })
      .first()
    if (!client) {
      throw new Exception('Client introuvable pour cette agence.', {
        status: 422,
        code: 'E_CLIENT_AGENCY',
      })
    }
    return client
  }

  #serializeExtensions(rental: Rental) {
    return (rental.extensions ?? []).map((ext) => ({
      id: ext.id,
      previousEndDate: ext.previousEndDate?.toISODate?.() ?? ext.previousEndDate,
      newEndDate: ext.newEndDate?.toISODate?.() ?? ext.newEndDate,
      addedDays: ext.addedDays,
      dailyPrice: ext.dailyPrice,
      amountHt: ext.amountHt,
      notes: ext.notes,
      createdAt: ext.createdAt?.toISO?.() ?? ext.createdAt,
      createdBy: ext.createdBy
        ? { id: ext.createdBy.id, fullName: ext.createdBy.fullName }
        : null,
    }))
  }

  async #withFinance(rental: Rental, serialize: HttpContext['serialize'], asOwner = false) {
    const finance = await rentalFinancials(rental)
    const serialized = asOwner
      ? await serialize(RentalTransformer.transform(rental).useVariant('ownerView'))
      : await serialize(RentalTransformer.transform(rental))
    const base = (serialized as { data?: Record<string, unknown> }).data ?? serialized

    if (!asOwner) {
      try {
        await rental.load('createdBy')
        await rental.load('updatedBy')
      } catch {
        // relations optionnelles
      }
    }

    const actors = asOwner
      ? {}
      : {
          createdBy: rental.createdBy
            ? { id: rental.createdBy.id, fullName: rental.createdBy.fullName }
            : null,
          updatedBy: rental.updatedBy
            ? { id: rental.updatedBy.id, fullName: rental.updatedBy.fullName }
            : null,
        }

    if (asOwner) {
      return {
        ...base,
        dailyPrice: finance.netDailyPrice,
        finance: {
          days: finance.days,
          netTotal: finance.netTotal,
          netDailyPrice: finance.netDailyPrice,
        },
      }
    }

    const paid = rental.amountPaid ?? 0
    return {
      ...base,
      ...actors,
      finance: {
        ...finance,
        balanceDue: Math.max(0, finance.ttc - paid),
      },
      extensions: this.#serializeExtensions(rental),
      extensionsCount: rental.extensions?.length ?? 0,
    }
  }

  async index({ request, serialize, agencyId }: HttpContext) {
    const status = request.input('status')
    const source = request.input('source')
    const vehicleId = request.input('vehicleId')
    const clientId = request.input('clientId')
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPageRaw = Number(request.input('perPage', 10)) || 10
    const perPage = Math.min(100, Math.max(1, perPageRaw))

    const query = Rental.query()
      .where('agencyId', agencyId!)
      .preload('vehicle')
      .preload('client')
      .preload('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))
    if (status) query.where('status', status)
    if (source === 'marketplace' || source === 'agency') query.where('source', source)
    if (vehicleId) query.where('vehicleId', vehicleId)
    if (clientId) query.where('clientId', clientId)

    // Ordre d’arrivée stable (id) — une modification ne change pas la position.
    const paginator = await query.orderBy('id', 'desc').paginate(page, perPage)
    paginator.baseUrl('/rentals')
    paginator.queryString(request.qs())

    const data = await Promise.all(
      paginator.all().map((rental) => this.#withFinance(rental, serialize))
    )

    const rawMeta = paginator.getMeta() as Record<string, unknown>
    return {
      meta: {
        total: Number(rawMeta.total ?? 0),
        perPage: Number(rawMeta.perPage ?? rawMeta.per_page ?? perPage),
        currentPage: Number(rawMeta.currentPage ?? rawMeta.current_page ?? page),
        lastPage: Number(rawMeta.lastPage ?? rawMeta.last_page ?? 1),
        firstPage: Number(rawMeta.firstPage ?? rawMeta.first_page ?? 1),
      },
      data,
    }
  }

  async store({ request, response, serialize, agencyId, auth }: HttpContext) {
    const payload = await request.validateUsing(createRentalValidator)
    const user = auth.use('api').getUserOrFail()
    await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)
    await this.#assertClientInAgency(payload.clientId, agencyId!)

    const rental = await this.#service.create({
      ...payload,
      agencyId: agencyId!,
      createdByUserId: user.id,
    })
    await rental.load('vehicle')
    await rental.load('client')
    await rental.load('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'rental.create',
      module: 'rentals',
      entityType: 'rental',
      entityId: rental.id,
      rentalId: rental.id,
      clientId: rental.clientId,
      vehicleId: rental.vehicleId,
      newValues: {
        startDate: payload.startDate,
        endDate: payload.endDate,
        dailyPrice: payload.dailyPrice,
        status: rental.status,
      },
      summary: `Création de la location #${rental.id}`,
      ip: request.ip(),
    })

    return response.created(await this.#withFinance(rental, serialize))
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const rental = await Rental.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .preload('vehicle')
      .preload('client')
      .preload('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))
      .firstOrFail()
    return this.#withFinance(rental, serialize)
  }

  async contract({ params, response, agencyId }: HttpContext) {
    const rental = await this.#contractService.loadRental(Number(params.id), agencyId!)
    const pdf = await this.#contractService.generate(rental)
    const filename = `contrat-location-${rental.id}.pdf`

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `inline; filename="${filename}"`)
    return response.send(pdf)
  }

  async update({ params, request, serialize, agencyId, auth }: HttpContext) {
    const rental = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(updateRentalValidator)
    const user = auth.use('api').getUserOrFail()

    if (payload.dailyPrice !== undefined) {
      await this.#permissions.assertPermission(user, 'rentals.update_price')
    }
    if (payload.startDate !== undefined || payload.endDate !== undefined) {
      await this.#permissions.assertPermission(user, 'rentals.update_dates')
    }
    if (payload.vehicleId !== undefined) {
      await this.#permissions.assertPermission(user, 'rentals.update_vehicle')
    }
    if (payload.amountPaid !== undefined) {
      await this.#permissions.assertPermission(user, 'rentals.record_payment')
    }
    if (payload.status === 'Annulée') {
      await this.#permissions.assertPermission(user, 'rentals.cancel')
    }

    if (payload.vehicleId) await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)
    if (payload.clientId) await this.#assertClientInAgency(payload.clientId, agencyId!)

    const before = pickAuditFields(
      {
        vehicleId: rental.vehicleId,
        clientId: rental.clientId,
        startDate: rental.startDate?.toISODate?.() ?? rental.startDate,
        endDate: rental.endDate?.toISODate?.() ?? rental.endDate,
        dailyPrice: rental.dailyPrice,
        amountPaid: rental.amountPaid,
        status: rental.status,
        notes: rental.notes,
      },
      [...RENTAL_AUDIT_FIELDS]
    )

    let priceGateMode: 'free' | 'notify' | 'require_approval' | undefined

    // Gate tarif
    if (payload.dailyPrice !== undefined && payload.dailyPrice !== rental.dailyPrice) {
      const gate = await this.#validation.gate({
        agencyId: agencyId!,
        actor: user,
        actionCode: 'rentals.update_price',
        module: 'rentals',
        entityType: 'rental',
        entityId: rental.id,
        rentalId: rental.id,
        clientId: rental.clientId,
        vehicleId: rental.vehicleId,
        oldValues: { dailyPrice: rental.dailyPrice },
        newValues: { dailyPrice: payload.dailyPrice },
        payload: { dailyPrice: payload.dailyPrice },
        summary: `Modification du tarif de la location #${rental.id} (${rental.dailyPrice} → ${payload.dailyPrice})`,
        ip: request.ip(),
      })
      if (gate.outcome === 'pending') {
        return pendingValidationResponse(gate.request)
      }
      priceGateMode = gate.mode
    }

    await this.#service.update(rental, payload)
    rental.updatedByUserId = user.id
    await rental.save()

    await rental.load('vehicle')
    await rental.load('client')
    await rental.load('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))

    const after = pickAuditFields(
      {
        vehicleId: rental.vehicleId,
        clientId: rental.clientId,
        startDate: rental.startDate?.toISODate?.() ?? rental.startDate,
        endDate: rental.endDate?.toISODate?.() ?? rental.endDate,
        dailyPrice: rental.dailyPrice,
        amountPaid: rental.amountPaid,
        status: rental.status,
        notes: rental.notes,
      },
      [...RENTAL_AUDIT_FIELDS]
    )
    const diff = diffValues(before, after)
    if (diff) {
      const action =
        payload.dailyPrice !== undefined && diff.newValues.dailyPrice !== undefined
          ? 'rental.update_price'
          : 'rental.update'
      await this.#audit.log({
        actor: user,
        agencyId: agencyId!,
        action,
        module: 'rentals',
        entityType: 'rental',
        entityId: rental.id,
        rentalId: rental.id,
        clientId: rental.clientId,
        vehicleId: rental.vehicleId,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        summary:
          action === 'rental.update_price'
            ? `Tarif location #${rental.id} : ${diff.oldValues.dailyPrice} → ${diff.newValues.dailyPrice}`
            : `Modification de la location #${rental.id}`,
        ip: request.ip(),
      })
    }

    if (priceGateMode === 'notify') {
      await this.#validation.notifyAfterProceed({
        agencyId: agencyId!,
        actor: user,
        actionCode: 'rentals.update_price',
        module: 'rentals',
        summary: `Tarif location #${rental.id} modifié`,
        entityType: 'rental',
        entityId: rental.id,
        rentalId: rental.id,
      })
    }

    return this.#withFinance(rental, serialize)
  }

  async extend({ params, request, auth, serialize, agencyId }: HttpContext) {
    const rental = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(extendRentalValidator)
    const user = auth.use('api').getUserOrFail()
    const previousEnd = rental.endDate?.toISODate?.() ?? String(rental.endDate)

    await this.#service.extend(rental, {
      ...payload,
      createdByUserId: user.id,
    })

    rental.updatedByUserId = user.id
    await rental.save()

    await rental.load('vehicle')
    await rental.load('client')
    await rental.load('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'rental.extend',
      module: 'rentals',
      entityType: 'rental',
      entityId: rental.id,
      rentalId: rental.id,
      clientId: rental.clientId,
      vehicleId: rental.vehicleId,
      oldValues: { endDate: previousEnd },
      newValues: { endDate: payload.newEndDate, dailyPrice: payload.dailyPrice ?? null },
      summary: `Prolongation location #${rental.id} jusqu’au ${payload.newEndDate}`,
      ip: request.ip(),
    })

    return this.#withFinance(rental, serialize)
  }

  async approve({ params, serialize, agencyId }: HttpContext) {
    const rental = await this.#findScoped(params.id, agencyId!)
    await this.#service.approveMarketplaceRequest(rental)
    await rental.load('vehicle')
    await rental.load('client')
    await rental.load('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))
    return this.#withFinance(rental, serialize)
  }

  async reject({ params, request, serialize, agencyId }: HttpContext) {
    const rental = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(rejectRentalValidator)
    await this.#service.rejectMarketplaceRequest(rental, payload.reason)
    await rental.load('vehicle')
    await rental.load('client')
    await rental.load('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))
    return this.#withFinance(rental, serialize)
  }

  async destroy({ params, request, response, agencyId, auth }: HttpContext) {
    const rental = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(cancelRentalValidator)
    const user = auth.use('api').getUserOrFail()

    const gate = await this.#validation.gate({
      agencyId: agencyId!,
      actor: user,
      actionCode: 'rentals.cancel',
      module: 'rentals',
      entityType: 'rental',
      entityId: rental.id,
      rentalId: rental.id,
      clientId: rental.clientId,
      vehicleId: rental.vehicleId,
      oldValues: { status: rental.status },
      newValues: { status: 'Annulée', reason: payload.reason ?? null },
      payload: { reason: payload.reason ?? null },
      summary: `Annulation de la location #${rental.id}`,
      ip: request.ip(),
    })
    if (gate.outcome === 'pending') {
      return pendingValidationResponse(gate.request)
    }

    await this.#service.cancel(rental, {
      reason: payload.reason,
      cancelledBy: 'agency',
    })
    rental.updatedByUserId = user.id
    await rental.save()

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'rental.cancel',
      module: 'rentals',
      entityType: 'rental',
      entityId: rental.id,
      rentalId: rental.id,
      clientId: rental.clientId,
      vehicleId: rental.vehicleId,
      oldValues: { status: 'active' },
      newValues: { status: 'Annulée', reason: payload.reason ?? null },
      summary: `Annulation de la location #${rental.id}`,
      ip: request.ip(),
    })

    if (gate.mode === 'notify') {
      await this.#validation.notifyAfterProceed({
        agencyId: agencyId!,
        actor: user,
        actionCode: 'rentals.cancel',
        module: 'rentals',
        summary: `Annulation de la location #${rental.id}`,
        entityType: 'rental',
        entityId: rental.id,
        rentalId: rental.id,
      })
    }

    return response.ok({ message: 'Location annulée.' })
  }
}
