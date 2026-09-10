import { BaseTransformer } from '@adonisjs/core/transformers'
import type OwnerNotification from '#models/owner_notification'

export default class OwnerNotificationTransformer extends BaseTransformer<OwnerNotification> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'ownerId',
        'type',
        'title',
        'body',
        'href',
        'meta',
        'createdAt',
        'updatedAt',
      ]),
      readAt: this.resource.readAt,
      isRead: Boolean(this.resource.readAt),
    }
  }
}
