import { AgencySchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Owner from '#models/owner'
import Client from '#models/client'
import Vehicle from '#models/vehicle'
import Setting from '#models/setting'
import City from '#models/city'

export default class Agency extends AgencySchema {
  @belongsTo(() => City)
  declare city: BelongsTo<typeof City>

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @hasMany(() => Owner)
  declare owners: HasMany<typeof Owner>

  @hasMany(() => Client)
  declare clients: HasMany<typeof Client>

  @hasMany(() => Vehicle)
  declare vehicles: HasMany<typeof Vehicle>

  @hasMany(() => Setting)
  declare settings: HasMany<typeof Setting>
}
