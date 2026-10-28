import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Maintenance from '#models/maintenance'
import Vehicle from '#models/vehicle'
import MaintenanceTransformer from '#transformers/maintenance_transformer'
import OwnerNotificationService from '#services/owner_notification_service'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'
import { createMaintenanceValidator, updateMaintenanceValidator } from '#validators/maintenance'
import {
  resolveMaintenanceCharge,
  scopeAppliedExpenses,
} from '#services/maintenance_expense_service'
import {
  assertMaintenanceTypeAllowed,
  maintenanceDisplayType,
  normalizeTypeDetail,
} from '#services/maintenance_type'
import { todayISO } from '#services/finance_service'
import { isPaginatedRequest, paginationMeta, readPage, unwrapSerializedList } from '#services/pagination'

function scopeSoon(query: ReturnType<typeof Maintenance.query>, today: string) {
  return query
    .whereNull('cancelledAt')
    .where('performedOn', '>', today)
    .whereNotNull('nextDueOn')
    .where('nextDueOn', '>', today)
    .whereRaw('next_due_on <= (?::date + alert_days)', [today])
}

const MAINTENANCE_TYPES = new Set([
  'Vidange',
  'Réparation',
  'Visite technique',
  'Assurance',
  'Pneumatiques',
  'Nettoyage',
  'Autre',
])

type MaintenanceSearch = {
  vehicleId?: string | number
  type?: string
  from?: string
  to?: string
  plate?: string
  owner?: string
}

function parseIsoDate(value: unknown) {
  const text = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

function likeTerm(value: string) {
  return `%${value.replace(/[%_\\]/g, '\\$&')}%`
}

function parseOwnerFilter(value: unknown) {
  const text = String(value ?? '').trim()
  if (text === 'agency') return 'agency'
  return /^\d+$/.test(text) ? text : ''
}

function applyMaintenanceSearch(
  query: ReturnType<typeof Maintenance.query>,
  filters: MaintenanceSearch
) {
  if (filters.vehicleId) query.where('vehicleId', filters.vehicleId)
  if (filters.type && MAINTENANCE_TYPES.has(filters.type)) query.where('type', filters.type)
  if (filters.from) query.where('performedOn', '>=', filters.from)
  if (filters.to) query.where('performedOn', '<=', filters.to)

  const plate = filters.plate?.trim()
  const owner = filters.owner
  const ownerId = owner && owner !== 'agency' ? Number(owner) : null
  if (!plate && owner !== 'agency' && !ownerId) return

  query.whereHas('vehicle', (vehicleQuery) => {
    if (owner === 'agency') vehicleQuery.whereNull('ownerId')
    else if (ownerId) vehicleQuery.where('ownerId', ownerId)
    if (!plate) return
    const term = likeTerm(plate)
    const compact = plate.replace(/[\s-]/g, '').toUpperCase()
    vehicleQuery.where((builder) => {
      builder.whereILike('plate', term)
      if (compact) {
        builder.orWhereRaw(`replace(replace(upper(plate), ' ', ''), '-', '') like ?`, [
          likeTerm(compact),
        ])
      }
    })
  })
}

function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return DateTime.fromISO(value)
}

function formatCost(cost: number) {
  return `${Number(cost || 0).toLocaleString('fr-FR')} F CFA`
}

type ExpenseNotifyKind = 'created' | 'updated' | 'removed'

async function notifyExpense(
  vehicle: Vehicle,
  maintenance: Pick<
    Maintenance,
    'id' | 'type' | 'typeDetail' | 'cost' | 'performedOn' | 'nextDueOn' | 'description'
  >,
  kind: ExpenseNotifyKind
) {
  if (!vehicle.ownerId) return
  try {
    const cost = Number(maintenance.cost || 0)
    const costLabel = formatCost(cost)
    const performed = maintenance.performedOn?.toISODate?.() ?? null
    const due =
      maintenance.nextDueOn !== null && maintenance.nextDueOn !== undefined
        ? ` Échéance suivante : ${maintenance.nextDueOn.toISODate()}.`
        : ''

    const titles = {
      created: 'Nouvelle dépense sur votre véhicule',
      updated: 'Dépense mise à jour',
      removed: 'Dépense annulée',
    } as const

    const bodies = {
      created: `${vehicle.label} (${vehicle.plate}) — ${maintenanceDisplayType(maintenance.type, maintenance.typeDetail)} : ${costLabel}${
        performed ? ` (le ${performed})` : ''
      }.${due}`,
      updated: `${vehicle.label} (${vehicle.plate}) — ${maintenanceDisplayType(maintenance.type, maintenance.typeDetail)} : montant ${costLabel}.${due}`,
      removed: `${vehicle.label} (${vehicle.plate}) — ${maintenanceDisplayType(maintenance.type, maintenance.typeDetail)} (${costLabel}) a été retiré de vos dépenses.`,
    } as const

    const types = {
      created: OWNER_NOTIFICATION_TYPES.EXPENSE_RECORDED,
      updated: OWNER_NOTIFICATION_TYPES.EXPENSE_UPDATED,
      removed: OWNER_NOTIFICATION_TYPES.EXPENSE_REMOVED,
    } as const

    await new OwnerNotificationService().notify(vehicle.ownerId, {
      type: types[kind],
      title: titles[kind],
      body: bodies[kind],
      href: `/portal/revenues?vehicleId=${vehicle.id}`,
      meta: {
        vehicleId: vehicle.id,
        maintenanceId: maintenance.id,
        type: maintenanceDisplayType(maintenance.type, maintenance.typeDetail),
        cost,
        kind,
      },
    })
  } catch {
    // Ne pas faire échouer l’opération métier
  }
}

function assertActive(row: Maintenance) {
  if (row.cancelledAt) {
    throw new Exception('Cet entretien est annulé et ne peut plus être modifié.', {
      status: 422,
      code: 'E_MAINTENANCE_CANCELLED',
    })
  }
}

export default class MaintenancesController {
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

  #scopedQuery(agencyId: number) {
    return Maintenance.query()
      .whereHas('vehicle', (q) => q.where('agencyId', agencyId))
      .preload('vehicle')
  }

  #filteredQuery(
    agencyId: number,
    filters: MaintenanceSearch & {
      includeCancelled?: boolean
      alert?: string
    }
  ) {
    const query = this.#scopedQuery(agencyId)
    applyMaintenanceSearch(query, filters)
    const today = todayISO()
    if (filters.alert === 'cancelled') query.whereNotNull('cancelledAt')
    else if (filters.alert === 'done') scopeAppliedExpenses(query, today)
    else if (filters.alert === 'soon') scopeSoon(query, today)
    else if (!filters.includeCancelled) query.whereNull('cancelledAt')
    return query
  }

  async #totals(agencyId: number, filters: MaintenanceSearch) {
    const base = () => {
      const query = Maintenance.query().whereHas('vehicle', (q) => q.where('agencyId', agencyId))
      applyMaintenanceSearch(query, filters)
      return query
    }
    const sumCharged = async (chargedTo: 'owner' | 'agency') => {
      const rows = await scopeAppliedExpenses(base()).where('chargedTo', chargedTo).sum('cost as total')
      return Number(rows[0]?.$extras?.total ?? 0)
    }
    const today = todayISO()
    const count = async (apply: (query: ReturnType<typeof Maintenance.query>) => void) => {
      const query = base()
      apply(query)
      const rows = await query.count('* as total')
      return Number(rows[0]?.$extras?.total ?? 0)
    }
    const [owner, agency, total, done, soon, cancelled] = await Promise.all([
      sumCharged('owner'),
      sumCharged('agency'),
      count((query) => query.whereNull('cancelledAt')),
      count((query) => scopeAppliedExpenses(query, today)),
      count((query) => scopeSoon(query, today)),
      count((query) => query.whereNotNull('cancelledAt')),
    ])
    return { owner, agency, total, done, soon, cancelled }
  }

  async index({ request, serialize, agencyId }: HttpContext) {
    const vehicleId = request.input('vehicleId')
    const type = String(request.input('type', '')).trim()
    const includeCancelled =
      request.input('includeCancelled') === 'true' || request.input('includeCancelled') === true
    const alert = String(request.input('alert') || '')
    const search: MaintenanceSearch = {
      vehicleId,
      type: MAINTENANCE_TYPES.has(type) ? type : '',
      from: parseIsoDate(request.input('from')),
      to: parseIsoDate(request.input('to')),
      plate: String(request.input('plate', '')).trim().slice(0, 40),
      owner: parseOwnerFilter(request.input('owner')),
    }
    const filters = {
      ...search,
      includeCancelled,
      alert: alert === 'done' || alert === 'soon' || alert === 'cancelled' ? alert : undefined,
    }

    if (!isPaginatedRequest(request)) {
      const rows = await this.#filteredQuery(agencyId!, filters)
        .orderBy('performedOn', 'desc')
        .orderBy('id', 'desc')
      return serialize(MaintenanceTransformer.transform(rows))
    }

    const { page, perPage } = readPage(request)
    const paginator = await this.#filteredQuery(agencyId!, filters)
      .orderBy('performedOn', 'desc')
      .orderBy('id', 'desc')
      .paginate(page, perPage)
    const serialized = await serialize(MaintenanceTransformer.transform(paginator.all()))

    return {
      data: unwrapSerializedList(serialized),
      meta: paginationMeta(paginator, page, perPage),
      totals: await this.#totals(agencyId!, search),
    }
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createMaintenanceValidator)
    const vehicle = await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)
    const chargedTo = resolveMaintenanceCharge(vehicle.ownerId, payload.chargedTo)
    assertMaintenanceTypeAllowed(payload.type)
    const typeDetail = normalizeTypeDetail(payload.type, payload.typeDetail)

    const row = await Maintenance.create({
      vehicleId: payload.vehicleId,
      type: payload.type,
      typeDetail,
      performedOn: DateTime.fromISO(payload.performedOn),
      cost: payload.cost,
      chargedTo,
      mileage: payload.mileage ?? null,
      provider: payload.provider ?? null,
      nextDueOn: toDate(payload.nextDueOn) ?? null,
      alertDays: payload.alertDays ?? 30,
      description: payload.description ?? null,
      cancelledAt: null,
      cancelReason: null,
      cancelledByUserId: null,
    })
    await row.load('vehicle')
    if (row.vehicle && chargedTo === 'owner') {
      await notifyExpense(row.vehicle, row, 'created')
    }
    return response.created(await serialize(MaintenanceTransformer.transform(row)))
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const row = await Maintenance.query()
      .where('id', params.id)
      .whereHas('vehicle', (q) => q.where('agencyId', agencyId!))
      .preload('vehicle')
      .firstOrFail()
    return serialize(MaintenanceTransformer.transform(row))
  }

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const row = await Maintenance.query()
      .where('id', params.id)
      .whereHas('vehicle', (q) => q.where('agencyId', agencyId!))
      .firstOrFail()
    assertActive(row)
    const payload = await request.validateUsing(updateMaintenanceValidator)
    const previousVehicleId = row.vehicleId
    const previousType = row.type
    const previousDue = row.nextDueOn?.toISODate() ?? null
    const previousCost = Number(row.cost || 0)
    const previousChargedTo = row.chargedTo
    const previousSnapshot = {
      id: row.id,
      type: row.type,
      typeDetail: row.typeDetail,
      cost: row.cost,
      performedOn: row.performedOn,
      nextDueOn: row.nextDueOn,
      description: row.description,
    }

    const targetVehicle = payload.vehicleId
      ? await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)
      : await Vehicle.query().where('id', row.vehicleId).where('agencyId', agencyId!).firstOrFail()
    const chargedTo = resolveMaintenanceCharge(
      targetVehicle.ownerId,
      payload.chargedTo === undefined ? row.chargedTo : payload.chargedTo
    )
    const nextType = payload.type ?? row.type
    assertMaintenanceTypeAllowed(nextType, row.type)
    const nextDetail = normalizeTypeDetail(
      nextType,
      payload.typeDetail === undefined ? row.typeDetail : payload.typeDetail
    )

    row.merge({
      vehicleId: payload.vehicleId ?? row.vehicleId,
      type: nextType,
      typeDetail: nextDetail,
      cost: payload.cost ?? row.cost,
      chargedTo,
      mileage: payload.mileage === undefined ? row.mileage : payload.mileage,
      provider: payload.provider === undefined ? row.provider : payload.provider,
      alertDays: payload.alertDays ?? row.alertDays,
      description: payload.description === undefined ? row.description : payload.description,
    })

    if (payload.performedOn) {
      row.performedOn = DateTime.fromISO(payload.performedOn)
    }
    if (payload.nextDueOn !== undefined) {
      row.nextDueOn = toDate(payload.nextDueOn) ?? null
    }

    await row.save()
    await row.load('vehicle')

    const nextDue = row.nextDueOn?.toISODate() ?? null
    const nextCost = Number(row.cost || 0)
    const vehicleChanged = row.vehicleId !== previousVehicleId
    const chargeChanged = row.chargedTo !== previousChargedTo
    const meaningful =
      row.type !== previousType ||
      nextDue !== previousDue ||
      nextCost !== previousCost ||
      vehicleChanged ||
      chargeChanged

    if (meaningful) {
      if (vehicleChanged) {
        const previousVehicle = await Vehicle.query()
          .where('id', previousVehicleId)
          .where('agencyId', agencyId!)
          .first()
        if (previousVehicle && previousChargedTo === 'owner') {
          await notifyExpense(previousVehicle, previousSnapshot, 'removed')
        }
        if (row.vehicle && row.chargedTo === 'owner') {
          await notifyExpense(row.vehicle, row, 'created')
        }
      } else if (row.vehicle && previousChargedTo === 'owner' && row.chargedTo === 'agency') {
        await notifyExpense(row.vehicle, row, 'removed')
      } else if (row.vehicle && previousChargedTo === 'agency' && row.chargedTo === 'owner') {
        await notifyExpense(row.vehicle, row, 'created')
      } else if (row.vehicle && row.chargedTo === 'owner') {
        await notifyExpense(row.vehicle, row, 'updated')
      }
    }

    return serialize(MaintenanceTransformer.transform(row))
  }

  /**
   * Annulation soft : conserve l’historique, retire la dépense des totaux, notifie le owner.
   */
  async destroy({ params, request, auth, serialize, agencyId }: HttpContext) {
    const row = await Maintenance.query()
      .where('id', params.id)
      .whereHas('vehicle', (q) => q.where('agencyId', agencyId!))
      .firstOrFail()
    if (row.cancelledAt) {
      throw new Exception('Cet entretien est déjà annulé.', {
        status: 422,
        code: 'E_MAINTENANCE_ALREADY_CANCELLED',
      })
    }

    await row.load('vehicle')
    const reason = String(request.input('reason') || '').trim() || null
    const user = auth.user

    row.cancelledAt = DateTime.now()
    row.cancelReason = reason
    row.cancelledByUserId = user?.id ?? null
    await row.save()

    if (row.vehicle && row.chargedTo === 'owner') {
      await notifyExpense(row.vehicle, row, 'removed')
    }

    return serialize(MaintenanceTransformer.transform(row))
  }
}
