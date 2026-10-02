import Maintenance from '#models/maintenance'
import { todayISO } from '#services/finance_service'

export type MaintenanceChargeTo = 'owner' | 'agency'

/**
 * Voiture agence : toujours l’agence.
 * Voiture en mandat : `agency` si demandé, sinon le propriétaire.
 */
export function resolveMaintenanceCharge(
  ownerId: number | null | undefined,
  requested?: string | null
): MaintenanceChargeTo {
  if (!ownerId) return 'agency'
  return requested === 'agency' ? 'agency' : 'owner'
}

/** Le coût réduit le solde du propriétaire (relevé, portail, fiche mandat). */
export function isOwnerCharge(
  ownerId: number | null | undefined,
  chargedTo?: string | null
) {
  return resolveMaintenanceCharge(ownerId, chargedTo) === 'owner'
}

/**
 * Dépense appliquée au solde : non annulée et date d’intervention ≤ aujourd’hui (Fait).
 */
export function isExpenseApplied(
  row: Pick<Maintenance, 'cancelledAt' | 'performedOn'>,
  today: string = todayISO()
) {
  if (row.cancelledAt) return false
  const performed = row.performedOn?.toISODate?.() ?? null
  if (!performed) return false
  return performed <= today
}

/**
 * Filtre query : entretiens dont le coût doit entrer dans les totaux (statut Fait).
 */
export function scopeAppliedExpenses(
  query: ReturnType<typeof Maintenance.query>,
  today: string = todayISO()
) {
  return query.whereNull('cancelledAt').where('performedOn', '<=', today)
}

/** Entretiens appliqués et déduits du solde propriétaire. */
export function scopeAppliedOwnerExpenses(
  query: ReturnType<typeof Maintenance.query>,
  today: string = todayISO()
) {
  return scopeAppliedExpenses(query, today).where('chargedTo', 'owner')
}
