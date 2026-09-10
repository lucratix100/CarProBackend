import { MaintenanceSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#models/vehicle'
import User from '#models/user'

export default class Maintenance extends MaintenanceSchema {
  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => User, { foreignKey: 'cancelledByUserId' })
  declare cancelledBy: BelongsTo<typeof User>

  get isCancelled() {
    return this.cancelledAt !== null
  }
}
