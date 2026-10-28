import vine from '@vinejs/vine'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const maintenanceCharges = ['owner', 'agency'] as const

const maintenanceTypes = [
  'Vidange',
  'Réparation',
  'Pneumatiques',
  'Nettoyage',
  'Autre',
] as const

/** Conservés pour les lignes déjà enregistrées. Les nouvelles passent par Conformité. */
const legacyMaintenanceTypes = ['Visite technique', 'Assurance'] as const

export const createMaintenanceValidator = vine.create({
  vehicleId: vine.number().positive(),
  type: vine.enum(maintenanceTypes),
  typeDetail: vine.string().trim().maxLength(80).optional(),
  performedOn: isoDate(),
  cost: vine.number().min(0),
  chargedTo: vine.enum(maintenanceCharges).optional(),
  mileage: vine.number().min(0).optional(),
  provider: vine.string().trim().maxLength(160).optional(),
  nextDueOn: isoDate().optional(),
  alertDays: vine.number().min(0).max(365).optional(),
  description: vine.string().trim().maxLength(2000).optional(),
})

export const updateMaintenanceValidator = vine.create({
  vehicleId: vine.number().positive().optional(),
  type: vine.enum([...maintenanceTypes, ...legacyMaintenanceTypes]).optional(),
  typeDetail: vine.string().trim().maxLength(80).nullable().optional(),
  performedOn: isoDate().optional(),
  cost: vine.number().min(0).optional(),
  chargedTo: vine.enum(maintenanceCharges).optional(),
  mileage: vine.number().min(0).nullable().optional(),
  provider: vine.string().trim().maxLength(160).nullable().optional(),
  nextDueOn: isoDate().nullable().optional(),
  alertDays: vine.number().min(0).max(365).optional(),
  description: vine.string().trim().maxLength(2000).nullable().optional(),
})
