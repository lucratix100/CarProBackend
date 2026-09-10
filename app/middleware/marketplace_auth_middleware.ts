import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Authentifie un compte client marketplace (guard `marketplace`).
 */
export default class MarketplaceAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ctx.auth.authenticateUsing(['marketplace'])
    return next()
  }
}
