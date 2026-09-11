import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'
import OwnerTransformer from '#transformers/owner_transformer'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    const owner = OwnerTransformer.transform(this.whenLoaded(this.resource.owner))
    const agencyRel = this.whenLoaded(this.resource.agency) as unknown as
      | { id: number; name: string; slug: string }
      | null
      | undefined

    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
        'phone',
        'role',
        'status',
        'agencyId',
        'termsVersion',
        'termsAcceptedAt',
        'passwordSetAt',
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
          }
        : null,
    }
  }
}
