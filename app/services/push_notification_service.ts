import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import PushSubscription from '#models/push_subscription'
import {
  sendWebPushNotification,
  WebPushError,
  type VapidDetails,
} from '#services/web_push_client'

export type PushPayload = {
  title: string
  body: string
  href?: string | null
  tag?: string | null
}

export default class PushNotificationService {
  #vapid: VapidDetails | null = null

  constructor() {
    const publicKey = env.get('VAPID_PUBLIC_KEY')
    const privateKey = env.get('VAPID_PRIVATE_KEY')
    if (!publicKey || !privateKey) return

    this.#vapid = {
      publicKey,
      privateKey,
      subject: env.get('VAPID_SUBJECT') || `mailto:${env.get('MAIL_FROM_ADDRESS')}`,
    }
  }

  isConfigured() {
    return this.#vapid !== null
  }

  getPublicKey() {
    return this.#vapid?.publicKey ?? null
  }

  async subscribe(
    userId: number,
    input: {
      endpoint: string
      keys: { p256dh: string; auth: string }
      userAgent?: string | null
    }
  ) {
    const existing = await PushSubscription.query()
      .where('endpoint', input.endpoint)
      .first()

    if (existing) {
      existing.userId = userId
      existing.p256Dh = input.keys.p256dh
      existing.auth = input.keys.auth
      existing.userAgent = input.userAgent ?? existing.userAgent
      await existing.save()
      return existing
    }

    return PushSubscription.create({
      userId,
      endpoint: input.endpoint,
      p256Dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    })
  }

  async unsubscribe(userId: number, endpoint: string) {
    await PushSubscription.query()
      .where('userId', userId)
      .where('endpoint', endpoint)
      .delete()
  }

  async sendToUser(userId: number, payload: PushPayload) {
    if (!this.#vapid) return

    const rows = await PushSubscription.query().where('userId', userId)
    if (rows.length === 0) return

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      href: payload.href ?? null,
      tag: payload.tag ?? null,
    })

    await Promise.all(
      rows.map(async (row) => {
        try {
          await sendWebPushNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256Dh, auth: row.auth },
            },
            body,
            this.#vapid!
          )
        } catch (error: unknown) {
          const statusCode =
            error instanceof WebPushError
              ? error.statusCode
              : error && typeof error === 'object' && 'statusCode' in error
                ? Number((error as { statusCode: number }).statusCode)
                : null

          if (statusCode === 404 || statusCode === 410) {
            await row.delete()
            return
          }

          logger.warn(
            { err: error, userId, endpoint: row.endpoint },
            'Échec envoi notification push'
          )
        }
      })
    )
  }

  /** Envoi non bloquant : n’interrompt jamais la création de notif in-app. */
  sendToUserLater(userId: number, payload: PushPayload) {
    void this.sendToUser(userId, payload).catch((error) => {
      logger.warn({ err: error, userId }, 'Push asynchrone en échec')
    })
  }
}
