import Maintenance from '#models/maintenance'
import { todayISO } from '#services/finance_service'

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
