import { VehicleExpenseSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#models/vehicle'
import Agency from '#models/agency'
import User from '#models/user'

export const VEHICLE_EXPENSE_TYPES = [
  'Achat',
  'Assurance',
  'Carburant',
  'Parking',
  'Vignette',
  'Réparation',
  'Accessoire',
  'Autre',
] as const

export type VehicleExpenseType = (typeof VEHICLE_EXPENSE_TYPES)[number]

export default class VehicleExpense extends VehicleExpenseSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>
}
