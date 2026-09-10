import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Maintenance from '#models/maintenance'
import Vehicle from '#models/vehicle'
import MaintenanceTransformer from '#transformers/maintenance_transformer'
import OwnerNotificationService from '#services/owner_notification_service'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'
import { createMaintenanceValidator, updateMaintenanceValidator } from '#validators/maintenance'

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
  maintenance: Pick<Maintenance, 'id' | 'type' | 'cost' | 'performedOn' | 'nextDueOn' | 'description'>,
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
      created: `${vehicle.label} (${vehicle.plate}) — ${maintenance.type} : ${costLabel}${
        performed ? ` (le ${performed})` : ''
      }.${due}`,
      updated: `${vehicle.label} (${vehicle.plate}) — ${maintenance.type} : montant ${costLabel}.${due}`,
      removed: `${vehicle.label} (${vehicle.plate}) — ${maintenance.type} (${costLabel}) a été retiré de vos dépenses.`,
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
        type: maintenance.type,
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

  async index({ request, serialize, agencyId }: HttpContext) {
    const vehicleId = request.input('vehicleId')
    const type = request.input('type')
    const includeCancelled =
      request.input('includeCancelled') === 'true' || request.input('includeCancelled') === true

    const query = this.#scopedQuery(agencyId!)
    if (vehicleId) query.where('vehicleId', vehicleId)
    if (type) query.where('type', type)
    if (!includeCancelled) query.whereNull('cancelledAt')

    const rows = await query.orderBy('performedOn', 'desc').orderBy('id', 'desc')
    return serialize(MaintenanceTransformer.transform(rows))
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createMaintenanceValidator)
    await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)

    const row = await Maintenance.create({
      vehicleId: payload.vehicleId,
      type: payload.type,
      performedOn: DateTime.fromISO(payload.performedOn),
      cost: payload.cost,
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
    if (row.vehicle) {
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
    const previousSnapshot = {
      id: row.id,
      type: row.type,
      cost: row.cost,
      performedOn: row.performedOn,
      nextDueOn: row.nextDueOn,
      description: row.description,
    }

    if (payload.vehicleId) await this.#assertVehicleInAgency(payload.vehicleId, agencyId!)

    row.merge({
      vehicleId: payload.vehicleId ?? row.vehicleId,
      type: payload.type ?? row.type,
      cost: payload.cost ?? row.cost,
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
    const meaningful =
      row.type !== previousType ||
      nextDue !== previousDue ||
      nextCost !== previousCost ||
      vehicleChanged

    if (meaningful) {
      if (vehicleChanged) {
        const previousVehicle = await Vehicle.query()
          .where('id', previousVehicleId)
          .where('agencyId', agencyId!)
          .first()
        if (previousVehicle) {
          await notifyExpense(previousVehicle, previousSnapshot, 'removed')
        }
        if (row.vehicle) {
          await notifyExpense(row.vehicle, row, 'created')
        }
      } else if (row.vehicle) {
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

    if (row.vehicle) {
      await notifyExpense(row.vehicle, row, 'removed')
    }

    return serialize(MaintenanceTransformer.transform(row))
  }
}
