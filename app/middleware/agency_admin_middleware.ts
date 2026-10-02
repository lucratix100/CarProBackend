import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Exception } from '@adonisjs/core/exceptions'

/**
 * Réservé au gérant d’agence (role=admin), pas aux collaborateurs staff.
 */
export default class AgencyAdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.use('api').getUserOrFail()
    if (user.role !== 'admin' || user.status !== 'active') {
      throw new Exception('Accès réservé à l’administrateur de l’agence.', {
        status: 403,
        code: 'E_AGENCY_ADMIN_ONLY',
      })
    }
    return next()
  }
}
