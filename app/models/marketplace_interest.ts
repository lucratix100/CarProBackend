import { MarketplaceInterestSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ClientAccount from '#models/client_account'
import Vehicle from '#models/vehicle'
import Agency from '#models/agency'

export default class MarketplaceInterest extends MarketplaceInterestSchema {
  @belongsTo(() => ClientAccount)
  declare clientAccount: BelongsTo<typeof ClientAccount>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>
}
