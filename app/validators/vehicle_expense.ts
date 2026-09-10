import vine from '@vinejs/vine'
import { VEHICLE_EXPENSE_TYPES } from '#models/vehicle_expense'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const createVehicleExpenseValidator = vine.create({
  vehicleId: vine.number().positive(),
  type: vine.enum(VEHICLE_EXPENSE_TYPES),
  amount: vine.number().min(0),
  spentOn: isoDate(),
  provider: vine.string().trim().maxLength(160).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})

export const updateVehicleExpenseValidator = vine.create({
  type: vine.enum(VEHICLE_EXPENSE_TYPES).optional(),
  amount: vine.number().min(0).optional(),
  spentOn: isoDate().optional(),
  provider: vine.string().trim().maxLength(160).nullable().optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  cancel: vine.boolean().optional(),
  cancelReason: vine.string().trim().maxLength(500).optional(),
})
