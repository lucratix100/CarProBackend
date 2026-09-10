import { MarqueSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Modele from '#models/modele'
import Vehicle from '#models/vehicle'

export default class Marque extends MarqueSchema {
  @hasMany(() => Modele)
  declare modeles: HasMany<typeof Modele>

  @hasMany(() => Vehicle)
  declare vehicles: HasMany<typeof Vehicle>
}
