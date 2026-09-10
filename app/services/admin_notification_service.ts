import { DateTime } from 'luxon'
import AdminNotification from '#models/admin_notification'
import User from '#models/user'

export type AdminNotifyPayload = {
  type: string
  title: string
  body: string
  href?: string | null
  meta?: Record<string, unknown> | null
}

export default class AdminNotificationService {
  async notifyAgencyAdmins(agencyId: number, payload: AdminNotifyPayload) {
    const admins = await User.query()
      .where('role', 'admin')
      .where('status', 'active')
      .where('agencyId', agencyId)
    const rows = []
    for (const admin of admins) {
      rows.push(
        await AdminNotification.create({
          userId: admin.id,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          href: payload.href ?? null,
          meta: payload.meta ?? null,
          readAt: null,
        })
      )
    }
    return rows
  }

  async listForAdmin(userId: number, options?: { unreadOnly?: boolean; limit?: number }) {
    const query = AdminNotification.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc')

    if (options?.unreadOnly) query.whereNull('readAt')
    if (options?.limit) query.limit(options.limit)
    return query
  }

  async unreadCount(userId: number) {
    const result = await AdminNotification.query()
      .where('userId', userId)
      .whereNull('readAt')
      .count('* as total')
    return Number(result[0]?.$extras?.total ?? 0)
  }

  async markRead(userId: number, id: number) {
    const notification = await AdminNotification.query()
      .where('id', id)
      .where('userId', userId)
      .firstOrFail()

    if (!notification.readAt) {
      notification.readAt = DateTime.now()
      await notification.save()
    }
    return notification
  }

  async markAllRead(userId: number) {
    await AdminNotification.query()
      .where('userId', userId)
      .whereNull('readAt')
      .update({ readAt: DateTime.now().toSQL({ includeOffset: false }) })
  }
}
