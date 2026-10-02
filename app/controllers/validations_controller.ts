import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ValidationService from '#services/validation_service'

const updateSettingsValidator = vine.create({
  settings: vine.array(
    vine.object({
      actionCode: vine.string().trim().maxLength(80),
      mode: vine.enum(['free', 'notify', 'require_approval'] as const),
    })
  ),
})

const reviewValidator = vine.create({
  note: vine.string().trim().maxLength(500).nullable().optional(),
})

/**
 * Paramètres de sécurité + file de validation — gérant d’agence uniquement.
 */
export default class ValidationsController {
  #service = new ValidationService()

  async settings({ agencyId }: HttpContext) {
    const data = await this.#service.listSettings(agencyId!)
    return { data }
  }

  async updateSettings({ request, agencyId }: HttpContext) {
    const payload = await request.validateUsing(updateSettingsValidator)
    const data = await this.#service.updateSettings(agencyId!, payload.settings)
    return { data }
  }

  async index({ request, agencyId }: HttpContext) {
    const status = request.input('status') as string | undefined
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPage = Math.min(100, Math.max(1, Number(request.input('perPage', 20)) || 20))
    const paginator = await this.#service.listRequests(agencyId!, { status, page, perPage })
    return {
      meta: paginator.getMeta(),
      data: paginator.all().map((r) => this.#service.serializeRequest(r)),
    }
  }

  async pendingCount({ agencyId }: HttpContext) {
    const paginator = await this.#service.listRequests(agencyId!, {
      status: 'pending',
      page: 1,
      perPage: 1,
    })
    return { count: paginator.getMeta().total }
  }

  async approve({ params, request, agencyId, auth }: HttpContext) {
    const payload = await request.validateUsing(reviewValidator)
    const reviewer = auth.use('api').getUserOrFail()
    const requestRow = await this.#service.approve(
      Number(params.id),
      agencyId!,
      reviewer,
      payload.note
    )
    return { data: this.#service.serializeRequest(requestRow) }
  }

  async reject({ params, request, agencyId, auth }: HttpContext) {
    const payload = await request.validateUsing(reviewValidator)
    const reviewer = auth.use('api').getUserOrFail()
    const requestRow = await this.#service.reject(
      Number(params.id),
      agencyId!,
      reviewer,
      payload.note
    )
    return { data: this.#service.serializeRequest(requestRow) }
  }
}
