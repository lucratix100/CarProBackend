import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Exception } from '@adonisjs/core/exceptions'
import Agency from '#models/agency'

/**
 * Collaborateurs, validations et journal : réservés aux agences
 * explicitement autorisées par le super admin.
 */
export default class StaffModuleMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.use('api').getUserOrFail()
    if (!user.agencyId) {
      throw new Exception('Aucune agence associée à ce compte.', {
        status: 403,
        code: 'E_NO_AGENCY',
      })
    }

    const agency = await Agency.find(user.agencyId)
    if (!agency?.staffModuleEnabled) {
      throw new Exception(
        'Collaborateurs, validations et journal ne sont pas autorisés pour cette agence.',
        { status: 403, code: 'E_STAFF_MODULE_DISABLED' }
      )
    }

    return next()
  }
}
