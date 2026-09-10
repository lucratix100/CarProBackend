import { RentalSchema } from '#database/schema'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Vehicle from '#models/vehicle'
import Client from '#models/client'
import Invoice from '#models/invoice'
import RentalExtension from '#models/rental_extension'
import Agency from '#models/agency'
import MarketplaceReview from '#models/marketplace_review'

export default class Rental extends RentalSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @hasOne(() => Invoice)
  declare invoice: HasOne<typeof Invoice>

  @hasMany(() => RentalExtension)
  declare extensions: HasMany<typeof RentalExtension>

  @hasOne(() => MarketplaceReview)
  declare review: HasOne<typeof MarketplaceReview>
}
