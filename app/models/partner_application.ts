import { PartnerApplicationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Agency from '#models/agency'
import City from '#models/city'
import ClientAccount from '#models/client_account'
import Owner from '#models/owner'
import User from '#models/user'

export default class PartnerApplication extends PartnerApplicationSchema {
  @belongsTo(() => ClientAccount)
  declare clientAccount: BelongsTo<typeof ClientAccount>

  @belongsTo(() => City)
  declare city: BelongsTo<typeof City>

  @belongsTo(() => Agency, { foreignKey: 'requestedAgencyId' })
  declare requestedAgency: BelongsTo<typeof Agency>

  @belongsTo(() => User, { foreignKey: 'reviewedByUserId' })
  declare reviewedBy: BelongsTo<typeof User>

  @belongsTo(() => Agency, { foreignKey: 'createdAgencyId' })
  declare createdAgency: BelongsTo<typeof Agency>

  @belongsTo(() => Owner, { foreignKey: 'createdOwnerId' })
  declare createdOwner: BelongsTo<typeof Owner>
}
