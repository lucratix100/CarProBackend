import { DateTime } from 'luxon'
import Vehicle from '#models/vehicle'
import VehicleComplianceDocument from '#models/vehicle_compliance_document'
import VehicleComplianceService from '#services/vehicle_compliance_service'
import { todayISO } from '#services/finance_service'

export const COMPLIANCE_KINDS = ['insurance', 'technical_visit'] as const
export type ComplianceKind = (typeof COMPLIANCE_KINDS)[number]

export function complianceKindLabel(kind: string) {
  return kind === 'insurance' ? 'Assurance' : 'Visite technique'
}

/** Date à laquelle le coût entre dans les soldes : début de couverture, sinon jour d’enregistrement. */
export function complianceSpentOn(row: VehicleComplianceDocument) {
  return row.startsOn ?? row.createdAt
}

export function complianceSpentIso(row: VehicleComplianceDocument) {
  return complianceSpentOn(row)?.toISODate?.() ?? null
}

export function isComplianceCostApplied(
  row: VehicleComplianceDocument,
  today: string = todayISO()
) {
  const spent = complianceSpentIso(row)
  if (!spent) return false
  return spent <= today
}

/**
 * Le document dont la fin est la plus lointaine devient l’échéance du véhicule
 * (alertes, hors service, publication).
 */
export async function applyComplianceKind(vehicleId: number, kind: ComplianceKind) {
  const vehicle = await Vehicle.findOrFail(vehicleId)
  const latest = await VehicleComplianceDocument.query()
    .where('vehicleId', vehicleId)
    .where('kind', kind)
    .orderBy('expiresOn', 'desc')
    .orderBy('id', 'desc')
    .first()

  const nextIso = latest?.expiresOn?.toISODate() ?? null
  const previous =
    kind === 'insurance' ? vehicle.insuranceExpiresAt : vehicle.technicalVisitAt
  const previousIso = previous?.toISODate() ?? null
  const dateChanged = nextIso !== previousIso

  if (kind === 'insurance') {
    if (dateChanged) {
      vehicle.insuranceExpiresAt = latest?.expiresOn ?? null
      vehicle.insuranceAlertStage = null
    }
    vehicle.insuranceCompany = latest?.provider ?? null
  } else if (dateChanged) {
    vehicle.technicalVisitAt = latest?.expiresOn ?? null
    vehicle.technicalVisitAlertStage = null
  }

  await vehicle.save()

  if (!dateChanged) return vehicle

  try {
    await new VehicleComplianceService().syncVehicle(vehicle)
    await vehicle.refresh()
  } catch {
    // La date est enregistrée même si la notification échoue.
  }

  return vehicle
}

export async function complianceDocumentsForVehicles(vehicleIds: number[]) {
  if (vehicleIds.length === 0) return [] as VehicleComplianceDocument[]
  return VehicleComplianceDocument.query()
    .whereIn('vehicleId', vehicleIds)
    .preload('vehicle')
    .orderBy('expiresOn', 'desc')
    .orderBy('id', 'desc')
}

/** Coûts déjà exigibles, à la charge du propriétaire, éventuellement filtrés par date. */
export async function appliedOwnerComplianceCosts(
  vehicleIds: number[],
  range: { from?: string | null; to?: string | null } = {}
) {
  const rows = await complianceDocumentsForVehicles(vehicleIds)
  return rows.filter((row) => {
    if (row.chargedTo !== 'owner') return false
    if (!isComplianceCostApplied(row)) return false
    const spent = complianceSpentIso(row)
    if (!spent) return false
    if (range.from && spent < range.from) return false
    if (range.to && spent > range.to) return false
    return true
  })
}

export function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return DateTime.fromISO(value)
}
