import type { HttpContext } from '@adonisjs/core/http'
import AdminNotificationService from '#services/admin_notification_service'
import AdminNotificationTransformer from '#transformers/admin_notification_transformer'

export default class AdminNotificationsController {
  #service() {
    return new AdminNotificationService()
  }

  async index({ auth, request, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const unreadOnly = request.input('unreadOnly') === 'true' || request.input('unreadOnly') === true
    const limit = Math.min(Number(request.input('limit')) || 50, 100)
    const rows = await this.#service().listForAdmin(user.id, { unreadOnly, limit })
    return serialize(AdminNotificationTransformer.transform(rows))
  }

  async unreadCount({ auth, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const unreadCount = await this.#service().unreadCount(user.id)
    return serialize({ unreadCount })
  }

  async markRead({ auth, params, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const row = await this.#service().markRead(user.id, Number(params.id))
    return serialize(AdminNotificationTransformer.transform(row))
  }

  async markAllRead({ auth, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    await this.#service().markAllRead(user.id)
    return response.ok({ message: 'Toutes les notifications ont été marquées comme lues.' })
  }
}
