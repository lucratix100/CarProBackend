import { BaseTransformer } from '@adonisjs/core/transformers'
import type Invoice from '#models/invoice'

export default class InvoiceTransformer extends BaseTransformer<Invoice> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'clientId',
        'rentalId',
        'amountHt',
        'issuedOn',
        'status',
        'description',
        'createdAt',
        'updatedAt',
      ]),
      client: this.resource.client
        ? {
            id: this.resource.client.id,
            fullName: this.resource.client.fullName,
            phone: this.resource.client.phone,
          }
        : null,
    }
  }
}
