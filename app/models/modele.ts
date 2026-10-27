import { ModeleSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Marque from '#models/marque'
import Vehicle from '#models/vehicle'
import Agency from '#models/agency'

export default class Modele extends ModeleSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Marque)
  declare marque: BelongsTo<typeof Marque>

  @hasMany(() => Vehicle)
  declare vehicles: HasMany<typeof Vehicle>
}
