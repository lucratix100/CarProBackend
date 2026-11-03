import { VehicleSaleSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Agency from '#models/agency'
import Vehicle from '#models/vehicle'
import Client from '#models/client'
import ClientAccount from '#models/client_account'
import User from '#models/user'

export default class VehicleSale extends VehicleSaleSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => ClientAccount)
  declare clientAccount: BelongsTo<typeof ClientAccount>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedByUserId' })
  declare updatedBy: BelongsTo<typeof User>
}
