import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Exception } from '@adonisjs/core/exceptions'
import { requireAgencyId } from '#services/agency_context'

/**
 * Accès console agence : gérant (admin) ou collaborateur (staff) actifs.
 * Définit ctx.agencyId pour le tenant.
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.use('api').getUserOrFail()

    const isOperator = user.role === 'admin' || user.role === 'staff'
    if (!isOperator || user.status !== 'active') {
      throw new Exception('Accès réservé au personnel de l’agence.', {
        status: 403,
        code: 'E_AGENCY_STAFF_ONLY',
      })
    }

    ctx.agencyId = requireAgencyId(user)

    return next()
  }
}
