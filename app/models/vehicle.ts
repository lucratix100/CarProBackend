import { VehicleSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Owner from '#models/owner'
import Rental from '#models/rental'
import Maintenance from '#models/maintenance'
import Marque from '#models/marque'
import Modele from '#models/modele'
import Agency from '#models/agency'
import VehiclePhoto from '#models/vehicle_photo'

export default class Vehicle extends VehicleSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Owner)
  declare owner: BelongsTo<typeof Owner>

  @belongsTo(() => Marque)
  declare marque: BelongsTo<typeof Marque>

  @belongsTo(() => Modele)
  declare modele: BelongsTo<typeof Modele>

  @hasMany(() => Rental)
  declare rentals: HasMany<typeof Rental>

  @hasMany(() => Maintenance)
  declare maintenances: HasMany<typeof Maintenance>

  @hasMany(() => VehiclePhoto)
  declare photos: HasMany<typeof VehiclePhoto>

  get label() {
    return `${this.brand} ${this.model}`
  }
}
