import { MarqueSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Modele from '#models/modele'
import Vehicle from '#models/vehicle'
import Agency from '#models/agency'

export default class Marque extends MarqueSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @hasMany(() => Modele)
  declare modeles: HasMany<typeof Modele>

  @hasMany(() => Vehicle)
  declare vehicles: HasMany<typeof Vehicle>
}
