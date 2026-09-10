import { RentalExtensionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Rental from '#models/rental'
import User from '#models/user'

export default class RentalExtension extends RentalExtensionSchema {
  @belongsTo(() => Rental)
  declare rental: BelongsTo<typeof Rental>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>
}
