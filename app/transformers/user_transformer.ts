import type User from '#models/user'
import type Agency from '#models/agency'
import { BaseTransformer } from '@adonisjs/core/transformers'
import OwnerTransformer from '#transformers/owner_transformer'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    const owner = OwnerTransformer.transform(this.whenLoaded(this.resource.owner))
    const agencyRel = this.whenLoaded(this.resource.agency) as unknown as Agency | null | undefined

    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
        'phone',
        'role',
        'status',
        'agencyId',
        'staffRoleId',
        'jobTitle',
        'termsVersion',
        'termsAcceptedAt',
        'passwordSetAt',
        'invitationExpiresAt',
        'createdAt',
        'updatedAt',
        'initials',
      ]),
      owner: owner ? owner.useVariant('summary') : null,
      agency: agencyRel
        ? {
            id: agencyRel.id,
            name: agencyRel.name,
            slug: agencyRel.slug,
            vehicleLimit: agencyRel.vehicleLimit,
            staffLimit: agencyRel.staffLimit,
            staffPaused: Boolean(agencyRel.staffPaused),
            acceptOwnerApplications: Boolean(agencyRel.acceptOwnerApplications),
          }
        : null,
    }
  }
}
