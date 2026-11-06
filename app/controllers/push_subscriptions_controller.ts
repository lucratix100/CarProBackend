import type { HttpContext } from '@adonisjs/core/http'
import PushNotificationService from '#services/push_notification_service'
import {
  pushSubscribeValidator,
  pushUnsubscribeValidator,
} from '#validators/push_subscription'

export default class PushSubscriptionsController {
  #service() {
    return new PushNotificationService()
  }

  async vapidPublicKey({ response, serialize }: HttpContext) {
    const service = this.#service()
    const publicKey = service.getPublicKey()
    if (!publicKey || !service.isConfigured()) {
      return response.serviceUnavailable({
        message: 'Les notifications push ne sont pas configurées sur ce serveur.',
      })
    }
    return serialize({ publicKey })
  }

  async status({ auth, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const service = this.#service()
    const enabled = service.isConfigured()
    return serialize({
      enabled,
      publicKey: enabled ? service.getPublicKey() : null,
      userId: user.id,
    })
  }

  async subscribe({ auth, request, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const service = this.#service()
    if (!service.isConfigured()) {
      return response.serviceUnavailable({
        message: 'Les notifications push ne sont pas configurées sur ce serveur.',
      })
    }

    const payload = await request.validateUsing(pushSubscribeValidator)
    const row = await service.subscribe(user.id, {
      endpoint: payload.endpoint,
      keys: payload.keys,
      userAgent: request.header('user-agent') ?? null,
    })

    return response.ok({
      id: row.id,
      endpoint: row.endpoint,
    })
  }

  async unsubscribe({ auth, request, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const payload = await request.validateUsing(pushUnsubscribeValidator)
    await this.#service().unsubscribe(user.id, payload.endpoint)
    return response.ok({ message: 'Abonnement push supprimé.' })
  }
}
