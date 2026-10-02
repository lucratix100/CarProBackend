import hash from '@adonisjs/core/services/hash'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import PasswordResetService, { PASSWORD_RESET_HOURS } from '#services/password_reset_service'
import PermissionService from '#services/permission_service'
import AgencyPlanService from '#services/agency_plan_service'
import PartnerApplication from '#models/partner_application'
import { changePasswordValidator } from '#validators/user'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    if (user.role === 'owner') {
      await user.load('owner')
    }
    if (user.agencyId) {
      await user.load('agency')
    }
    if (user.staffRoleId) {
      await user.load('staffRole')
    }

    const base = await serialize(UserTransformer.transform(user))
    const data = ((base as { data?: Record<string, unknown> }).data ??
      base) as Record<string, unknown>

    if (user.role === 'admin' || user.role === 'staff') {
      const permissions = await new PermissionService().getEffectivePermissionsMap(user)
      const plan = new AgencyPlanService()
      const agencyId = user.agency?.id
      const [vehicleCount, staffSeatCount, pendingOwnerApplications] = agencyId
        ? await Promise.all([
            plan.countVehicles(agencyId),
            plan.countStaffSeats(agencyId),
            PartnerApplication.query()
              .where('requestedAgencyId', agencyId)
              .where('type', 'owner')
              .where('status', 'pending')
              .count('* as total')
              .then((rows) => Number(rows[0]?.$extras?.total ?? 0)),
          ])
        : [0, 0, 0]
      const agency =
        data.agency && typeof data.agency === 'object'
          ? {
              ...(data.agency as Record<string, unknown>),
              vehicleCount,
              staffSeatCount,
              pendingOwnerApplications,
            }
          : data.agency
      return {
        ...data,
        agency,
        permissions,
        staffRole: user.staffRole
          ? {
              id: user.staffRole.id,
              slug: user.staffRole.slug,
              name: user.staffRole.name,
            }
          : null,
      }
    }

    return data
  }

  /**
   * Vérifie le mot de passe actuel puis envoie un lien de reset (24 h) par email.
   */
  async changePassword({ auth, request }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const { currentPassword } = await request.validateUsing(changePasswordValidator)

    const matches = await hash.verify(user.password, currentPassword)
    if (!matches) {
      throw new Exception('Mot de passe actuel incorrect.', {
        status: 422,
        code: 'E_INVALID_CURRENT_PASSWORD',
      })
    }

    const result = await new PasswordResetService().issueResetForUser(
      user,
      PASSWORD_RESET_HOURS
    )

    return result
  }
}
