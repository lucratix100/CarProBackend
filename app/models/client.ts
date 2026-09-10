import { ClientSchema } from '#database/schema'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Rental from '#models/rental'
import Invoice from '#models/invoice'
import Agency from '#models/agency'
import ClientAccount from '#models/client_account'

export default class Client extends ClientSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @hasOne(() => ClientAccount)
  declare account: HasOne<typeof ClientAccount>

  @hasMany(() => Rental)
  declare rentals: HasMany<typeof Rental>

  @hasMany(() => Invoice)
  declare invoices: HasMany<typeof Invoice>
}
