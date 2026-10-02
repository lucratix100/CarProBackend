import { ClientSchema } from '#database/schema'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Rental from '#models/rental'
import Invoice from '#models/invoice'
import Agency from '#models/agency'
import ClientAccount from '#models/client_account'
import User from '#models/user'

export default class Client extends ClientSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedByUserId' })
  declare updatedBy: BelongsTo<typeof User>

  @hasOne(() => ClientAccount)
  declare account: HasOne<typeof ClientAccount>

  @hasMany(() => Rental)
  declare rentals: HasMany<typeof Rental>

  @hasMany(() => Invoice)
  declare invoices: HasMany<typeof Invoice>
}
