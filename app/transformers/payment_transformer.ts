import { BaseTransformer } from '@adonisjs/core/transformers'
import type Payment from '#models/payment'

export default class PaymentTransformer extends BaseTransformer<Payment> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'invoiceId',
      'amount',
      'paidOn',
      'method',
      'reference',
      'notes',
      'createdAt',
      'updatedAt',
    ])
  }
}
