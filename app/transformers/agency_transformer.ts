import type Agency from '#models/agency'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class AgencyTransformer extends BaseTransformer<Agency> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'name',
        'slug',
        'isActive',
        'isVerified',
        'notes',
        'cityId',
        'publishOnMarketplace',
        'marketplaceRejectionStreak',
        'marketplacePublishBannedUntil',
        'createdAt',
        'updatedAt',
      ]),
      city: this.resource.city
        ? {
            id: this.resource.city.id,
            name: this.resource.city.name,
            region: this.resource.city.region,
            slug: this.resource.city.slug,
          }
        : null,
    }
  }
}
