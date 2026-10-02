import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import PermissionService from '#services/permission_service'

type PermissionOptions =
  | {
      permission: string
    }
  | {
      permissions: string[]
      mode?: 'all' | 'any'
    }

/**
 * Vérifie une ou plusieurs permissions après auth + admin middleware.
 * Les gérants d’agence (role=admin) passent toujours.
 */
export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: PermissionOptions) {
    const user = ctx.auth.use('api').getUserOrFail()
    const service = new PermissionService()

    if ('permission' in options) {
      await service.assertPermission(user, options.permission)
    } else {
      const mode = options.mode ?? 'all'
      if (mode === 'any') {
        await service.assertAnyPermission(user, options.permissions)
      } else {
        for (const code of options.permissions) {
          await service.assertPermission(user, code)
        }
      }
    }

    return next()
  }
}
