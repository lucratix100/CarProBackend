import { MarketplaceReportSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#models/vehicle'
import Agency from '#models/agency'
import ClientAccount from '#models/client_account'
import Rental from '#models/rental'

export default class MarketplaceReport extends MarketplaceReportSchema {
  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => ClientAccount)
  declare clientAccount: BelongsTo<typeof ClientAccount>

  @belongsTo(() => Rental)
  declare rental: BelongsTo<typeof Rental>
}
