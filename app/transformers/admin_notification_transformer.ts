import { BaseTransformer } from '@adonisjs/core/transformers'
import type AdminNotification from '#models/admin_notification'

export default class AdminNotificationTransformer extends BaseTransformer<AdminNotification> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
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
