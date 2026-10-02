import { BaseTransformer } from '@adonisjs/core/transformers'
import type HomepageBanner from '#models/homepage_banner'

export default class HomepageBannerTransformer extends BaseTransformer<HomepageBanner> {
  toObject() {
    const hasImage = Boolean(this.resource.imagePath)

    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'body',
        'linkUrl',
        'linkLabel',
        'placement',
        'sortOrder',
        'isActive',
        'startsAt',
        'endsAt',
        'createdAt',
        'updatedAt',
      ]),
      hasImage,
      isLive: this.resource.isLive(),
      imageUrl: hasImage ? `/api/v1/marketplace/banners/${this.resource.id}/image` : null,
      adminImageUrl: hasImage ? `/homepage-banners/${this.resource.id}/image` : null,
    }
  }
}
