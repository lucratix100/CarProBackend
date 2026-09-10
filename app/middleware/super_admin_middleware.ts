import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Exception } from '@adonisjs/core/exceptions'

/**
 * Restricts a route to platform super admins.
 */
export default class SuperAdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.use('api').getUserOrFail()

    if (user.role !== 'super_admin' || user.status !== 'active') {
      throw new Exception('Accès réservé au super administrateur.', {
        status: 403,
        code: 'E_SUPER_ADMIN_ONLY',
      })
    }

    return next()
  }
}
