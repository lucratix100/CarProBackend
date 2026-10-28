import { Exception } from '@adonisjs/core/exceptions'

/** Types encore en base, désormais gérés dans Conformité. */
export const LEGACY_COMPLIANCE_MAINTENANCE_TYPES = ['Visite technique', 'Assurance'] as const

export function maintenanceDisplayType(type: string, typeDetail?: string | null) {
  const detail = typeDetail?.trim()
  if (type === 'Autre' && detail) return `Autre · ${detail}`
  return type
}

export function normalizeTypeDetail(type: string, typeDetail?: string | null) {
  if (type !== 'Autre') return null
  const detail = (typeDetail ?? '').trim()
  if (detail.length < 2) {
    throw new Exception(
      'Précisez le type d’entretien (au moins 2 caractères) lorsque vous choisissez Autre.',
      { status: 422, code: 'E_TYPE_DETAIL_REQUIRED' }
    )
  }
  return detail.slice(0, 80)
}

/** Empêche de recréer une assurance ou une visite technique comme entretien. */
export function assertMaintenanceTypeAllowed(type: string, previousType?: string) {
  if (
    (LEGACY_COMPLIANCE_MAINTENANCE_TYPES as readonly string[]).includes(type) &&
    type !== previousType
  ) {
    throw new Exception(
      'L’assurance et la visite technique se gèrent dans Conformité, pas dans les entretiens.',
      { status: 422, code: 'E_MAINTENANCE_TYPE' }
    )
  }
}
