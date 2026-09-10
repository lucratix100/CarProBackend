import { MarketplaceFavoriteSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ClientAccount from '#models/client_account'
import Vehicle from '#models/vehicle'

export default class MarketplaceFavorite extends MarketplaceFavoriteSchema {
  @belongsTo(() => ClientAccount)
  declare clientAccount: BelongsTo<typeof ClientAccount>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
