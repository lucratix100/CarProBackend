import { DateTime } from 'luxon'
import OwnerNotification from '#models/owner_notification'
import Vehicle from '#models/vehicle'
import type { OwnerNotificationType } from '#constants/owner_notification_types'

export type NotifyPayload = {
  type: OwnerNotificationType
  title: string
  body: string
  href?: string | null
  meta?: Record<string, unknown> | null
}

export default class OwnerNotificationService {
  async notify(ownerId: number, payload: NotifyPayload) {
    return OwnerNotification.create({
      ownerId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      href: payload.href ?? null,
      meta: payload.meta ?? null,
      readAt: null,
    })
  }

  /**
   * Résout le propriétaire via le véhicule, puis crée la notification.
   */
  async notifyVehicleOwner(vehicleId: number, payload: NotifyPayload) {
    const vehicle = await Vehicle.find(vehicleId)
    if (!vehicle?.ownerId) return null
    return this.notify(vehicle.ownerId, {
      ...payload,
      meta: {
        vehicleId: vehicle.id,
        ...(payload.meta ?? {}),
      },
    })
  }

  async listForOwner(ownerId: number, options?: { unreadOnly?: boolean; limit?: number }) {
    const query = OwnerNotification.query()
      .where('ownerId', ownerId)
      .orderBy('createdAt', 'desc')

    if (options?.unreadOnly) {
      query.whereNull('readAt')
    }

    if (options?.limit) {
      query.limit(options.limit)
    }

    return query
  }

  async unreadCount(ownerId: number) {
    const result = await OwnerNotification.query()
      .where('ownerId', ownerId)
      .whereNull('readAt')
      .count('* as total')

    return Number(result[0]?.$extras?.total ?? 0)
  }

  async markRead(ownerId: number, id: number) {
    const notification = await OwnerNotification.query()
      .where('id', id)
      .where('ownerId', ownerId)
      .firstOrFail()

    if (!notification.readAt) {
      notification.readAt = DateTime.now()
      await notification.save()
    }

    return notification
  }

  async markAllRead(ownerId: number) {
    await OwnerNotification.query()
      .where('ownerId', ownerId)
      .whereNull('readAt')
      .update({ readAt: DateTime.now().toSQL({ includeOffset: false }) })
  }
}
