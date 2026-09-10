import { BaseTransformer } from '@adonisjs/core/transformers'
import type Client from '#models/client'

export default class ClientTransformer extends BaseTransformer<Client> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'fullName',
      'phone',
      'email',
      'licenseNumber',
      'licenseExpiresAt',
      'idCardNumber',
      'city',
      'birthDate',
      'type',
      'notes',
      'isActive',
      'createdAt',
      'updatedAt',
    ])
  }
}
