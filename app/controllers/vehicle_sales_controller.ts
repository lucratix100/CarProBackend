import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Vehicle from '#models/vehicle'
import Client from '#models/client'
import VehicleSale from '#models/vehicle_sale'
import VehicleSaleService from '#services/vehicle_sale_service'
import AuditService from '#services/audit_service'
import AdminNotificationService from '#services/admin_notification_service'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
import {
  createVehicleSaleValidator,
  listVehicleSalesValidator,
  markSoldVehicleSaleValidator,
  rejectVehicleSaleValidator,
} from '#validators/vehicle_sale'

export default class VehicleSalesController {
  #service = new VehicleSaleService()
  #audit = new AuditService()
  #notifications = new AdminNotificationService()

  async #findScoped(id: number | string, agencyId: number) {
    return VehicleSale.query().where('id', id).where('agencyId', agencyId).firstOrFail()
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

  #serialize(sale: VehicleSale) {
    return {
      id: sale.id,
      agencyId: sale.agencyId,
      vehicleId: sale.vehicleId,
      clientId: sale.clientId,
      clientAccountId: sale.clientAccountId,
      offeredPrice: sale.offeredPrice,
      finalPrice: sale.finalPrice,
      agencyCommission: sale.agencyCommission,
      paidCommission: sale.paidCommission,
      status: sale.status,
      notes: sale.notes,
      rejectReason: sale.rejectReason,
      acceptedAt: sale.acceptedAt?.toISO?.() ?? null,
      rejectedAt: sale.rejectedAt?.toISO?.() ?? null,
      cancelledAt: sale.cancelledAt?.toISO?.() ?? null,
      soldAt: sale.soldAt?.toISO?.() ?? null,
      createdAt: sale.createdAt?.toISO?.() ?? null,
      updatedAt: sale.updatedAt?.toISO?.() ?? null,
      vehicle: sale.vehicle
        ? {
            id: sale.vehicle.id,
            brand: sale.vehicle.brand,
            model: sale.vehicle.model,
            plate: sale.vehicle.plate,
            label: sale.vehicle.label,
            salePrice: sale.vehicle.salePrice,
            offerType: sale.vehicle.offerType,
            status: sale.vehicle.status,
            ownerId: sale.vehicle.ownerId,
          }
        : null,
      client: sale.client
        ? {
            id: sale.client.id,
            fullName: sale.client.fullName,
            phone: sale.client.phone,
            email: sale.client.email,
          }
        : null,
    }
  }

  async index({ request, agencyId }: HttpContext) {
    const filters = await request.validateUsing(listVehicleSalesValidator)
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 10

    const query = VehicleSale.query()
      .where('agencyId', agencyId!)
      .preload('vehicle')
      .preload('client')

    if (filters.status) query.where('status', filters.status)
    if (filters.vehicleId) query.where('vehicleId', filters.vehicleId)
    if (filters.clientId) query.where('clientId', filters.clientId)

    const paginator = await query.orderBy('id', 'desc').paginate(page, perPage)
    const rawMeta = paginator.getMeta() as Record<string, unknown>

    const count = async (status?: string) => {
      const q = VehicleSale.query().where('agencyId', agencyId!)
      if (status) q.where('status', status)
      const rows = await q.count('* as total')
      return Number(rows[0]?.$extras?.total ?? 0)
    }

    const [total, pending, accepted, rejected, cancelled, sold] = await Promise.all([
      count(),
      count('pending'),
      count('accepted'),
      count('rejected'),
      count('cancelled'),
      count('sold'),
    ])

    return {
      meta: {
        total: Number(rawMeta.total ?? 0),
        perPage: Number(rawMeta.perPage ?? rawMeta.per_page ?? perPage),
        currentPage: Number(rawMeta.currentPage ?? rawMeta.current_page ?? page),
        lastPage: Number(rawMeta.lastPage ?? rawMeta.last_page ?? 1),
        firstPage: Number(rawMeta.firstPage ?? rawMeta.first_page ?? 1),
      },
      data: paginator.all().map((sale) => this.#serialize(sale)),
      summary: { total, pending, accepted, rejected, cancelled, sold },
    }
  }

  async store({ request, response, agencyId, auth }: HttpContext) {
    const payload = await request.validateUsing(createVehicleSaleValidator)
    const user = auth.use('api').getUserOrFail()
    await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)
    await this.#assertClientInAgency(payload.clientId, agencyId!)

    const sale = await this.#service.createOffer({
      agencyId: agencyId!,
      vehicleId: payload.vehicleId,
      clientId: payload.clientId,
      offeredPrice: payload.offeredPrice,
      notes: payload.notes ?? null,
      createdByUserId: user.id,
    })

    await sale.load('vehicle')
    await sale.load('client')

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'sale.create',
      module: 'sales',
      entityType: 'vehicle_sale',
      entityId: sale.id,
      vehicleId: sale.vehicleId,
      clientId: sale.clientId,
      newValues: {
        offeredPrice: sale.offeredPrice,
        status: sale.status,
      },
      summary: `Offre de vente #${sale.id} créée`,
      ip: request.ip(),
    })

    return response.created(this.#serialize(sale))
  }

  async show({ params, agencyId }: HttpContext) {
    const sale = await VehicleSale.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .preload('vehicle')
      .preload('client')
      .firstOrFail()
    return this.#serialize(sale)
  }

  async accept({ params, request, response, agencyId, auth }: HttpContext) {
    const sale = await this.#findScoped(params.id, agencyId!)
    const user = auth.use('api').getUserOrFail()
    await this.#service.accept(sale, user.id)
    await sale.load('vehicle')
    await sale.load('client')

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'sale.accept',
      module: 'sales',
      entityType: 'vehicle_sale',
      entityId: sale.id,
      vehicleId: sale.vehicleId,
      clientId: sale.clientId,
      newValues: { status: sale.status, finalPrice: sale.finalPrice },
      summary: `Offre de vente #${sale.id} acceptée`,
      ip: request.ip(),
    })

    return response.ok(this.#serialize(sale))
  }

  async reject({ params, request, response, agencyId, auth }: HttpContext) {
    const sale = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(rejectVehicleSaleValidator)
    const user = auth.use('api').getUserOrFail()
    await this.#service.reject(sale, payload.reason, user.id)
    await sale.load('vehicle')
    await sale.load('client')

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'sale.reject',
      module: 'sales',
      entityType: 'vehicle_sale',
      entityId: sale.id,
      vehicleId: sale.vehicleId,
      clientId: sale.clientId,
      newValues: { status: sale.status, rejectReason: sale.rejectReason },
      summary: `Offre de vente #${sale.id} refusée`,
      ip: request.ip(),
    })

    return response.ok(this.#serialize(sale))
  }

  async markSold({ params, request, response, agencyId, auth }: HttpContext) {
    const sale = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(markSoldVehicleSaleValidator)
    const user = auth.use('api').getUserOrFail()

    await this.#service.markSold(sale, {
      finalPrice: payload.finalPrice,
      agencyCommission: payload.agencyCommission,
      paidCommission: payload.paidCommission,
      notes: payload.notes,
      userId: user.id,
    })
    await sale.load('vehicle')
    await sale.load('client')

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'sale.mark_sold',
      module: 'sales',
      entityType: 'vehicle_sale',
      entityId: sale.id,
      vehicleId: sale.vehicleId,
      clientId: sale.clientId,
      newValues: {
        status: sale.status,
        finalPrice: sale.finalPrice,
        vehicleStatus: sale.vehicle?.status,
      },
      summary: `Véhicule vendu via offre #${sale.id}`,
      ip: request.ip(),
    })

    await this.#notifications.notifyAgencyAdmins(agencyId!, {
      type: ADMIN_NOTIFICATION_TYPES.SENSITIVE_ACTION,
      title: 'Véhicule vendu',
      body: `${sale.vehicle?.label ?? 'Véhicule'} a été marqué comme vendu (offre #${sale.id}).`,
      href: '/admin/sales',
      meta: { saleId: sale.id, vehicleId: sale.vehicleId },
    })

    return response.ok(this.#serialize(sale))
  }
}
