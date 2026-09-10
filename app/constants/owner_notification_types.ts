/**
 * Types d’événements notifiés au propriétaire (portail lecture seule).
 * Uniquement les actions admin à impact métier — pas chaque PATCH technique.
 */
export const OWNER_NOTIFICATION_TYPES = {
  RENTAL_CREATED: 'rental_created',
  RENTAL_UPDATED: 'rental_updated',
  RENTAL_CANCELLED: 'rental_cancelled',
  RENTAL_EXTENDED: 'rental_extended',
  VEHICLE_ADDED: 'vehicle_added',
  VEHICLE_STATUS_CHANGED: 'vehicle_status_changed',
  VEHICLE_PRICE_CHANGED: 'vehicle_price_changed',
  VEHICLE_REMOVED: 'vehicle_removed',
  /** @deprecated préférer EXPENSE_* — conservé pour les notifs déjà en base */
  MAINTENANCE_RECORDED: 'maintenance_recorded',
  EXPENSE_RECORDED: 'expense_recorded',
  EXPENSE_UPDATED: 'expense_updated',
  EXPENSE_REMOVED: 'expense_removed',
  INSURANCE_SOON: 'insurance_soon',
  INSURANCE_EXPIRED: 'insurance_expired',
  TECHNICAL_VISIT_SOON: 'technical_visit_soon',
  TECHNICAL_VISIT_EXPIRED: 'technical_visit_expired',
  ACCOUNT_ACTIVATED: 'account_activated',
  ACCOUNT_DEACTIVATED: 'account_deactivated',
} as const

export type OwnerNotificationType =
  (typeof OWNER_NOTIFICATION_TYPES)[keyof typeof OWNER_NOTIFICATION_TYPES]
