import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Vehicle from '#models/vehicle'
import VehicleComplianceDocument from '#models/vehicle_compliance_document'
import ComplianceDocumentTransformer from '#transformers/compliance_document_transformer'
import OwnerNotificationService from '#services/owner_notification_service'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'
import { resolveMaintenanceCharge } from '#services/maintenance_expense_service'
import {
  applyComplianceKind,
  complianceKindLabel,
  type ComplianceKind,
} from '#services/compliance_document_service'
import {
  createComplianceDocumentValidator,
  updateComplianceDocumentValidator,
} from '#validators/compliance_document'
import { isPaginatedRequest, paginationMeta, readPage, unwrapSerializedList } from '#services/pagination'

function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return DateTime.fromISO(value)
}

function likeTerm(value: string) {
  return `%${value.replace(/[%_\\]/g, '\\$&')}%`
}

async function markCurrent(rows: VehicleComplianceDocument[]) {
  const vehicleIds = [...new Set(rows.map((row) => row.vehicleId))]
  if (vehicleIds.length === 0) return
  const ranked = await VehicleComplianceDocument.query()
    .whereIn('vehicleId', vehicleIds)
    .orderBy('expiresOn', 'desc')
    .orderBy('id', 'desc')
  const seen = new Set<string>()
  const current = new Set<number>()
  for (const row of ranked) {
    const key = `${row.vehicleId}:${row.kind}`
    if (seen.has(key)) continue
    seen.add(key)
    current.add(row.id)
  }
  for (const row of rows) {
    row.$extras.isCurrent = current.has(row.id)
  }
}

async function notifyCost(
  vehicle: Vehicle,
  row: { id: number; kind: string; cost: number; chargedTo: string },
  kind: 'created' | 'updated' | 'removed'
) {
  if (!vehicle.ownerId || row.chargedTo !== 'owner') return
  try {
    const label = complianceKindLabel(row.kind)
    const cost = Number(row.cost || 0)
    const costLabel = `${cost.toLocaleString('fr-FR')} F CFA`
    const titles = {
      created: 'Nouvelle dépense sur votre véhicule',
      updated: 'Dépense mise à jour',
      removed: 'Dépense annulée',
    } as const
    const bodies = {
      created: `${vehicle.label} (${vehicle.plate}) — ${label} : ${costLabel}.`,
      updated: `${vehicle.label} (${vehicle.plate}) — ${label} : montant ${costLabel}.`,
      removed: `${vehicle.label} (${vehicle.plate}) — ${label} (${costLabel}) a été retiré de vos dépenses.`,
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
      meta: { vehicleId: vehicle.id, complianceDocumentId: row.id, kind: row.kind, cost },
    })
  } catch {
    // Ne pas faire échouer l’enregistrement du document
  }
}

export default class ComplianceDocumentsController {
  async #assertVehicle(vehicleId: number, agencyId: number) {
    const vehicle = await Vehicle.query().where('id', vehicleId).where('agencyId', agencyId).first()
    if (!vehicle) {
      throw new Exception('Véhicule introuvable pour cette agence.', {
        status: 422,
        code: 'E_VEHICLE_AGENCY',
      })
    }
    return vehicle
  }

  #scoped(agencyId: number) {
    return VehicleComplianceDocument.query()
      .whereHas('vehicle', (query) => query.where('agencyId', agencyId))
      .preload('vehicle')
  }

  async index({ request, serialize, agencyId }: HttpContext) {
    const query = this.#scoped(agencyId!)
    const vehicleId = request.input('vehicleId')
    const kind = String(request.input('kind') || '')
    const plate = String(request.input('plate') || '').trim()

    if (vehicleId) query.where('vehicleId', vehicleId)
    if (kind === 'insurance' || kind === 'technical_visit') query.where('kind', kind)
    if (plate) {
      const term = likeTerm(plate)
      const compact = plate.replace(/[\s-]/g, '').toUpperCase()
      query.whereHas('vehicle', (vehicleQuery) => {
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

    query.orderBy('expiresOn', 'asc').orderBy('id', 'desc')

    if (!isPaginatedRequest(request)) {
      const rows = await query
      await markCurrent(rows)
      return serialize(ComplianceDocumentTransformer.transform(rows))
    }

    const { page, perPage } = readPage(request)
    const paginator = await query.paginate(page, perPage)
    const rows = paginator.all()
    await markCurrent(rows)
    const serialized = await serialize(ComplianceDocumentTransformer.transform(rows))
    return {
      data: unwrapSerializedList(serialized),
      meta: paginationMeta(paginator, page, perPage),
    }
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const row = await this.#scoped(agencyId!).where('id', params.id).firstOrFail()
    await markCurrent([row])
    return serialize(ComplianceDocumentTransformer.transform(row))
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createComplianceDocumentValidator)
    const vehicle = await this.#assertVehicle(payload.vehicleId, agencyId!)
    const chargedTo = resolveMaintenanceCharge(vehicle.ownerId, payload.chargedTo)

    const row = await VehicleComplianceDocument.create({
      vehicleId: payload.vehicleId,
      kind: payload.kind,
      provider: payload.provider,
      reference: payload.reference ?? null,
      startsOn: toDate(payload.startsOn) ?? null,
      expiresOn: DateTime.fromISO(payload.expiresOn),
      cost: Math.round(payload.cost),
      chargedTo,
      notes: payload.notes ?? null,
    })

    await applyComplianceKind(row.vehicleId, row.kind as ComplianceKind)
    await row.load('vehicle')
    await markCurrent([row])
    if (row.vehicle) await notifyCost(row.vehicle, row, 'created')
    return response.created(await serialize(ComplianceDocumentTransformer.transform(row)))
  }

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const row = await this.#scoped(agencyId!).where('id', params.id).firstOrFail()
    const payload = await request.validateUsing(updateComplianceDocumentValidator)
    const previousVehicleId = row.vehicleId
    const previousKind = row.kind as ComplianceKind
    const previousChargedTo = row.chargedTo
    const previousCost = Number(row.cost || 0)

    const target = payload.vehicleId
      ? await this.#assertVehicle(payload.vehicleId, agencyId!)
      : await this.#assertVehicle(row.vehicleId, agencyId!)
    const chargedTo = resolveMaintenanceCharge(
      target.ownerId,
      payload.chargedTo === undefined ? row.chargedTo : payload.chargedTo
    )

    row.merge({
      vehicleId: payload.vehicleId ?? row.vehicleId,
      kind: payload.kind ?? row.kind,
      provider: payload.provider ?? row.provider,
      reference: payload.reference === undefined ? row.reference : payload.reference,
      cost: payload.cost === undefined ? row.cost : Math.round(payload.cost),
      chargedTo,
      notes: payload.notes === undefined ? row.notes : payload.notes,
    })
    if (payload.startsOn !== undefined) row.startsOn = toDate(payload.startsOn) ?? null
    if (payload.expiresOn) row.expiresOn = DateTime.fromISO(payload.expiresOn)
    await row.save()

    await applyComplianceKind(previousVehicleId, previousKind)
    if (row.vehicleId !== previousVehicleId || row.kind !== previousKind) {
      await applyComplianceKind(row.vehicleId, row.kind as ComplianceKind)
    }

    await row.load('vehicle')
    await markCurrent([row])

    const costChanged =
      Number(row.cost || 0) !== previousCost ||
      row.chargedTo !== previousChargedTo ||
      row.vehicleId !== previousVehicleId
    if (costChanged && row.vehicle) {
      if (previousChargedTo === 'owner' && (row.chargedTo !== 'owner' || row.vehicleId !== previousVehicleId)) {
        const previousVehicle =
          row.vehicleId === previousVehicleId
            ? row.vehicle
            : await Vehicle.query().where('id', previousVehicleId).where('agencyId', agencyId!).first()
        if (previousVehicle) {
          await notifyCost(
            previousVehicle,
            { id: row.id, kind: previousKind, cost: previousCost, chargedTo: 'owner' },
            'removed'
          )
        }
      }
      if (row.chargedTo === 'owner') {
        await notifyCost(
          row.vehicle,
          row,
          previousChargedTo === 'owner' && row.vehicleId === previousVehicleId ? 'updated' : 'created'
        )
      }
    }

    return serialize(ComplianceDocumentTransformer.transform(row))
  }

  async destroy({ params, serialize, agencyId }: HttpContext) {
    const row = await this.#scoped(agencyId!).where('id', params.id).firstOrFail()
    const vehicleId = row.vehicleId
    const kind = row.kind as ComplianceKind
    await row.load('vehicle')
    const vehicle = row.vehicle
    await row.delete()
    await applyComplianceKind(vehicleId, kind)
    if (vehicle) await notifyCost(vehicle, row, 'removed')
    return serialize({ deleted: true, id: row.id })
  }
}
