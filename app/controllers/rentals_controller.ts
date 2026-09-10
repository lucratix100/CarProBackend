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

export default class RentalsController {
  #service = new RentalService()
  #contractService = new RentalContractService()

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

    const paginator = await query.orderBy('createdAt', 'desc').orderBy('id', 'desc').paginate(page, perPage)
    paginator.baseUrl('/rentals')
    paginator.queryString(request.qs())

    const data = await Promise.all(
      paginator.all().map((rental) => this.#withFinance(rental, serialize))
    )

    return {
      meta: paginator.getMeta(),
      data,
    }
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createRentalValidator)
    await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)
    await this.#assertClientInAgency(payload.clientId, agencyId!)

    const rental = await this.#service.create({ ...payload, agencyId: agencyId! })
    await rental.load('vehicle')
    await rental.load('client')
    await rental.load('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))

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

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const rental = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(updateRentalValidator)

    if (payload.vehicleId) await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)
    if (payload.clientId) await this.#assertClientInAgency(payload.clientId, agencyId!)

    await this.#service.update(rental, payload)
    await rental.load('vehicle')
    await rental.load('client')
    await rental.load('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))
    return this.#withFinance(rental, serialize)
  }

  async extend({ params, request, auth, serialize, agencyId }: HttpContext) {
    const rental = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(extendRentalValidator)
    const user = auth.use('api').getUserOrFail()

    await this.#service.extend(rental, {
      ...payload,
      createdByUserId: user.id,
    })

    await rental.load('vehicle')
    await rental.load('client')
    await rental.load('extensions', (q) => q.orderBy('id', 'asc').preload('createdBy'))
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

  async destroy({ params, request, response, agencyId }: HttpContext) {
    const rental = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(cancelRentalValidator)
    await this.#service.cancel(rental, {
      reason: payload.reason,
      cancelledBy: 'agency',
    })
    return response.ok({ message: 'Location annulée.' })
  }
}
