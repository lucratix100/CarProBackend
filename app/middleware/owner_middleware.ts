import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Exception } from '@adonisjs/core/exceptions'

/**
 * Restricts a route to authenticated active owners with an owner profile.
 */
export default class OwnerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.use('api').getUserOrFail()

    if (user.role !== 'owner' || user.status !== 'active') {
      throw new Exception('Accès réservé aux propriétaires.', {
        status: 403,
        code: 'E_OWNER_ONLY',
      })
    }

    await user.load('owner')
    if (!user.owner || !user.owner.isActive) {
      throw new Exception('Profil propriétaire introuvable ou inactif.', {
        status: 403,
        code: 'E_OWNER_INACTIVE',
      })
    }

    return next()
  }
}
