import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { Exception } from '@adonisjs/core/exceptions'
import Agency from '#models/agency'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards ?? ['api'])
    const user = ctx.auth.use('api').user
    if (user?.role === 'staff' && user.agencyId) {
      const agency = await Agency.find(user.agencyId)
      if (agency?.staffPaused) {
        throw new Exception(
          'L’accès des collaborateurs est en pause. Contactez le gérant de votre agence.',
          { status: 403, code: 'E_STAFF_PAUSED' }
        )
      }
    }
    return next()
  }
}
