/**
 * Fenêtre d’alerte avant expiration assurance / visite technique (jours).
 */
export const COMPLIANCE_ALERT_DAYS = 30

export const COMPLIANCE_ALERT_STAGES = {
  SOON: 'soon',
  EXPIRED: 'expired',
} as const

export type ComplianceAlertStage =
  (typeof COMPLIANCE_ALERT_STAGES)[keyof typeof COMPLIANCE_ALERT_STAGES]

/** @deprecated Prefer import from admin_notification_types */
export { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
