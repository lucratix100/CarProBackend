import { InvoiceSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Client from '#models/client'
import Rental from '#models/rental'
import Payment from '#models/payment'
import Agency from '#models/agency'

export default class Invoice extends InvoiceSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Rental)
  declare rental: BelongsTo<typeof Rental>

  @hasMany(() => Payment)
  declare payments: HasMany<typeof Payment>
}
