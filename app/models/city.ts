import { CitySchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Agency from '#models/agency'

export default class City extends CitySchema {
  @hasMany(() => Agency)
  declare agencies: HasMany<typeof Agency>
}
