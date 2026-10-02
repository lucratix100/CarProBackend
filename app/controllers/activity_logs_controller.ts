import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import ActivityLog from '#models/activity_log'
import Client from '#models/client'
import Rental from '#models/rental'
import Vehicle from '#models/vehicle'
import { activityLogsIndexValidator } from '#validators/activity_log'

function serializeLog(
  log: ActivityLog,
  client?: Pick<Client, 'id' | 'fullName'> | null,
  rental?: Pick<Rental, 'id' | 'status'> | null,
  vehicle?: Pick<Vehicle, 'id' | 'brand' | 'model' | 'plate'> | null
) {
  return {
    id: log.id,
    agencyId: log.agencyId,
    actorUserId: log.actorUserId,
    actorName: log.actorName,
    actorEmail: log.actorEmail,
    action: log.action,
    module: log.module,
    entityType: log.entityType,
    entityId: log.entityId,
    clientId: log.clientId,
    rentalId: log.rentalId,
    vehicleId: log.vehicleId,
    oldValues: log.oldValues,
    newValues: log.newValues,
    summary: log.summary,
    result: log.result,
    validatedByUserId: log.validatedByUserId,
    validatedByName: log.validatedByName,
    ip: log.ip,
    createdAt: log.createdAt?.toISO?.() ?? log.createdAt,
    client: client ? { id: client.id, fullName: client.fullName } : null,
    rental: rental ? { id: rental.id, status: rental.status } : null,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          plate: vehicle.plate,
          label: `${vehicle.brand} ${vehicle.model}`.trim(),
        }
      : null,
  }
}

/**
 * Journal d’activités — lecture seule, réservé au gérant d’agence.
 * Aucune route update/delete (append-only).
 */
export default class ActivityLogsController {
  async index({ request, agencyId }: HttpContext) {
    const filters = await request.validateUsing(activityLogsIndexValidator)
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = ActivityLog.query().where('agencyId', agencyId!).orderBy('id', 'desc')

    if (filters.actorUserId) query.where('actorUserId', filters.actorUserId)
    if (filters.module) query.where('module', filters.module)
    if (filters.action) query.where('action', filters.action)
    if (filters.clientId) query.where('clientId', filters.clientId)
    if (filters.rentalId) query.where('rentalId', filters.rentalId)
    if (filters.vehicleId) query.where('vehicleId', filters.vehicleId)
    if (filters.result) query.where('result', filters.result)
    if (filters.entityType) query.where('entityType', filters.entityType)
    if (filters.entityId) query.where('entityId', filters.entityId)

    if (filters.from) {
      const from = DateTime.fromISO(filters.from).startOf('day')
      if (from.isValid) query.where('createdAt', '>=', from.toSQL())
    }
    if (filters.to) {
      const to = DateTime.fromISO(filters.to).endOf('day')
      if (to.isValid) query.where('createdAt', '<=', to.toSQL())
    }

    if (filters.q) {
      const q = `%${filters.q.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('actorName', q)
          .orWhereILike('actorEmail', q)
          .orWhereILike('summary', q)
          .orWhereILike('action', q)
          .orWhereILike('module', q)
      })
    }

    const paginator = await query.paginate(page, perPage)
    const rows = paginator.all()

    const clientIds = [...new Set(rows.map((r) => r.clientId).filter(Boolean))] as number[]
    const rentalIds = [...new Set(rows.map((r) => r.rentalId).filter(Boolean))] as number[]
    const vehicleIds = [...new Set(rows.map((r) => r.vehicleId).filter(Boolean))] as number[]

    const [clients, rentals, vehicles] = await Promise.all([
      clientIds.length
        ? Client.query().whereIn('id', clientIds).select('id', 'fullName')
        : Promise.resolve([] as Client[]),
      rentalIds.length
        ? Rental.query().whereIn('id', rentalIds).select('id', 'status')
        : Promise.resolve([] as Rental[]),
      vehicleIds.length
        ? Vehicle.query().whereIn('id', vehicleIds).select('id', 'brand', 'model', 'plate')
        : Promise.resolve([] as Vehicle[]),
    ])

    const clientsById = new Map(clients.map((c) => [c.id, c]))
    const rentalsById = new Map(rentals.map((r) => [r.id, r]))
    const vehiclesById = new Map(vehicles.map((v) => [v.id, v]))

    return {
      meta: paginator.getMeta(),
      data: rows.map((log) =>
        serializeLog(
          log,
          log.clientId ? clientsById.get(log.clientId) : null,
          log.rentalId ? rentalsById.get(log.rentalId) : null,
          log.vehicleId ? vehiclesById.get(log.vehicleId) : null
        )
      ),
    }
  }

  /**
   * Historique d’une entité (location, client, véhicule…).
   */
  async forEntity({ params, request, agencyId }: HttpContext) {
    const entityType = String(params.entityType)
    const entityId = Number(params.entityId)
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPage = Math.min(100, Math.max(1, Number(request.input('perPage', 30)) || 30))

    const query = ActivityLog.query()
      .where('agencyId', agencyId!)
      .where('entityType', entityType)
      .where('entityId', entityId)
      .orderBy('id', 'desc')

    const paginator = await query.paginate(page, perPage)
    return {
      meta: paginator.getMeta(),
      data: paginator.all().map((log) => serializeLog(log)),
    }
  }
}
