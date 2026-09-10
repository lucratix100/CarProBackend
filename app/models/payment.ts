import { PaymentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Invoice from '#models/invoice'

export default class Payment extends PaymentSchema {
  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>
}
