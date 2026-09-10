import vine from '@vinejs/vine'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const maintenanceTypes = [
  'Vidange',
  'Réparation',
  'Visite technique',
  'Assurance',
  'Pneumatiques',
  'Nettoyage',
  'Autre',
] as const

export const createMaintenanceValidator = vine.create({
  vehicleId: vine.number().positive(),
  type: vine.enum(maintenanceTypes),
  performedOn: isoDate(),
  cost: vine.number().min(0),
  mileage: vine.number().min(0).optional(),
  provider: vine.string().trim().maxLength(160).optional(),
  nextDueOn: isoDate().optional(),
  alertDays: vine.number().min(0).max(365).optional(),
  description: vine.string().trim().maxLength(2000).optional(),
})

export const updateMaintenanceValidator = vine.create({
  vehicleId: vine.number().positive().optional(),
  type: vine.enum(maintenanceTypes).optional(),
  performedOn: isoDate().optional(),
  cost: vine.number().min(0).optional(),
  mileage: vine.number().min(0).nullable().optional(),
  provider: vine.string().trim().maxLength(160).nullable().optional(),
  nextDueOn: isoDate().nullable().optional(),
  alertDays: vine.number().min(0).max(365).optional(),
  description: vine.string().trim().maxLength(2000).nullable().optional(),
})
