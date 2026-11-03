import { VehicleSchema } from '#database/schema'
import { DateTime } from 'luxon'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Owner from '#models/owner'
import Rental from '#models/rental'
import Maintenance from '#models/maintenance'
import Marque from '#models/marque'
import Modele from '#models/modele'
import Agency from '#models/agency'
import VehiclePhoto from '#models/vehicle_photo'
import VehicleSale from '#models/vehicle_sale'
import User from '#models/user'

export default class Vehicle extends VehicleSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Owner)
  declare owner: BelongsTo<typeof Owner>

  @belongsTo(() => Marque)
  declare marque: BelongsTo<typeof Marque>

  @belongsTo(() => Modele)
  declare modele: BelongsTo<typeof Modele>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedByUserId' })
  declare updatedBy: BelongsTo<typeof User>

  @hasMany(() => Rental)
  declare rentals: HasMany<typeof Rental>

  @hasMany(() => Maintenance)
  declare maintenances: HasMany<typeof Maintenance>

  @hasMany(() => VehiclePhoto)
  declare photos: HasMany<typeof VehiclePhoto>

  @hasMany(() => VehicleSale)
  declare sales: HasMany<typeof VehicleSale>

  get label() {
    return `${this.brand} ${this.model}`
  }

  /** Même règle que les bannières : actif seulement si approuvé et dans la fenêtre de dates. */
  isBoostLive(now = DateTime.now()) {
    if (this.marketplacePublicationStatus !== 'published') return false
    if (this.boostStatus !== 'approved') return false
    if (this.boostStartsAt && now < this.boostStartsAt.startOf('day')) return false
    if (this.boostEndsAt && now > this.boostEndsAt.endOf('day')) return false
    return true
  }
}
