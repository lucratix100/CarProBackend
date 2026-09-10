import { MarketplaceReviewSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Rental from '#models/rental'
import Client from '#models/client'
import Agency from '#models/agency'
import Vehicle from '#models/vehicle'

export default class MarketplaceReview extends MarketplaceReviewSchema {
  @belongsTo(() => Rental)
  declare rental: BelongsTo<typeof Rental>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
