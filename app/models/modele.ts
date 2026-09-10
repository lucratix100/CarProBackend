import { ModeleSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Marque from '#models/marque'
import Vehicle from '#models/vehicle'

export default class Modele extends ModeleSchema {
  @belongsTo(() => Marque)
  declare marque: BelongsTo<typeof Marque>

  @hasMany(() => Vehicle)
  declare vehicles: HasMany<typeof Vehicle>
}
