import { OwnerSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Vehicle from '#models/vehicle'
import OwnerNotification from '#models/owner_notification'
import Agency from '#models/agency'

export default class Owner extends OwnerSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Vehicle)
  declare vehicles: HasMany<typeof Vehicle>

  @hasMany(() => OwnerNotification)
  declare notifications: HasMany<typeof OwnerNotification>
}
