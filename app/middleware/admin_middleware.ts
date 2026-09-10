import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Exception } from '@adonisjs/core/exceptions'
import { requireAgencyId } from '#services/agency_context'

/**
 * Restricts a route to authenticated agency admins (not super_admin).
 * Sets ctx.agencyId for tenant scoping.
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.use('api').getUserOrFail()

    if (user.role !== 'admin' || user.status !== 'active') {
      throw new Exception('Accès réservé aux administrateurs d’agence.', {
        status: 403,
        code: 'E_ADMIN_ONLY',
      })
    }

    ctx.agencyId = requireAgencyId(user)

    return next()
  }
}
