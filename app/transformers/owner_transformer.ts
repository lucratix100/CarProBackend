import { BaseTransformer } from '@adonisjs/core/transformers'
import type Owner from '#models/owner'

export default class OwnerTransformer extends BaseTransformer<Owner> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'userId',
      'phone',
      'city',
      'notes',
      'isActive',
      'createdAt',
      'updatedAt',
    ])
  }

  summary() {
    return this.pick(this.resource, ['id', 'phone', 'city', 'isActive'])
  }

  withUser() {
    return {
      ...this.toObject(),
      user: this.resource.user
        ? {
            id: this.resource.user.id,
            fullName: this.resource.user.fullName,
            email: this.resource.user.email,
            role: this.resource.user.role,
            status: this.resource.user.status,
            termsVersion: this.resource.user.termsVersion,
            termsAcceptedAt: this.resource.user.termsAcceptedAt,
            passwordSetAt: this.resource.user.passwordSetAt,
            invitationExpiresAt: this.resource.user.invitationExpiresAt,
            createdAt: this.resource.user.createdAt,
          }
        : null,
    }
  }
}
