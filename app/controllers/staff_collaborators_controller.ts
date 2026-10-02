import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import User from '#models/user'
import PermissionService from '#services/permission_service'
import StaffInvitationService from '#services/staff_invitation_service'
import {
  inviteStaffValidator,
  updateStaffStatusValidator,
  updateStaffValidator,
} from '#validators/staff'
import UserTransformer from '#transformers/user_transformer'
import AuditService from '#services/audit_service'

/**
 * Gestion des collaborateurs d’agence — réservée au gérant (admin).
 */
export default class StaffCollaboratorsController {
  #permissions = new PermissionService()
  #invites = new StaffInvitationService()
  #audit = new AuditService()

  async #findStaff(id: number | string, agencyId: number) {
    return User.query()
      .where('id', id)
      .where('agencyId', agencyId)
      .where('role', 'staff')
      .preload('staffRole', (q) => q.preload('permissions'))
      .firstOrFail()
  }

  async #serializeStaff(user: User, serialize: HttpContext['serialize']) {
    const permissions = await this.#permissions.getEffectivePermissionsMap(user)
    const base = await serialize(UserTransformer.transform(user))
    const data = (base as { data?: Record<string, unknown> }).data ?? base
    return {
      ...data,
      permissions,
      staffRole: user.staffRole
        ? {
            id: user.staffRole.id,
            slug: user.staffRole.slug,
            name: user.staffRole.name,
            description: user.staffRole.description,
            isSystem: user.staffRole.isSystem,
            permissionCodes: (user.staffRole.permissions ?? []).map((p) => p.code),
          }
        : null,
    }
  }

  async index({ serialize, agencyId }: HttpContext) {
    const users = await User.query()
      .where('agencyId', agencyId!)
      .where('role', 'staff')
      .preload('staffRole')
      .orderBy('fullName', 'asc')

    const items = []
    for (const user of users) {
      items.push(await this.#serializeStaff(user, serialize))
    }
    return { data: items }
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(inviteStaffValidator)
    try {
      const { user } = await this.#invites.invite({
        agencyId: agencyId!,
        ...payload,
      })
      await user.load('staffRole', (q) => q.preload('permissions'))
      return response.created(await this.#serializeStaff(user, serialize))
    } catch (error) {
      throw new Exception((error as Error).message, {
        status: 422,
        code: 'E_INVITE_STAFF',
      })
    }
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const user = await this.#findStaff(params.id, agencyId!)
    return this.#serializeStaff(user, serialize)
  }

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const user = await this.#findStaff(params.id, agencyId!)
    const payload = await request.validateUsing(updateStaffValidator)

    if (payload.firstName || payload.lastName) {
      const parts = (user.fullName ?? '').split(/\s+/)
      const first = payload.firstName?.trim() ?? parts[0] ?? ''
      const last =
        payload.lastName?.trim() ??
        (parts.length > 1 ? parts.slice(1).join(' ') : '')
      user.fullName = `${first} ${last}`.trim()
    }
    if (payload.phone !== undefined) user.phone = payload.phone.trim()
    if (payload.jobTitle !== undefined) user.jobTitle = payload.jobTitle?.trim() || null

    if (payload.staffRoleId !== undefined) {
      const role = await this.#permissions.findRoleForAgency(payload.staffRoleId, agencyId!)
      user.staffRoleId = role.id
    }

    await user.save()

    if (payload.permissionCodes) {
      await this.#permissions.setUserPermissionOverrides(user, payload.permissionCodes)
    }

    await user.load('staffRole', (q) => q.preload('permissions'))
    return this.#serializeStaff(user, serialize)
  }

  async updateStatus({ params, request, serialize, agencyId, auth }: HttpContext) {
    const user = await this.#findStaff(params.id, agencyId!)
    const { status } = await request.validateUsing(updateStaffStatusValidator)
    const actor = auth.use('api').getUserOrFail()
    const previous = user.status

    if (user.status === 'invited' && status === 'active') {
      throw new Exception(
        'Ce collaborateur doit d’abord activer son compte via l’invitation.',
        { status: 422, code: 'E_NOT_ACTIVATED' }
      )
    }

    user.status = status
    await user.save()

    if (status === 'blocked' || status === 'suspended') {
      await this.#invites.revokeAllSessions(user)
    }

    await this.#audit.log({
      actor,
      agencyId: agencyId!,
      action:
        status === 'blocked'
          ? 'staff.block'
          : status === 'suspended'
            ? 'staff.suspend'
            : 'staff.reactivate',
      module: 'staff',
      entityType: 'user',
      entityId: user.id,
      oldValues: { status: previous },
      newValues: { status },
      summary: `${user.fullName ?? user.email} : ${previous} → ${status}`,
      ip: request.ip(),
    })

    await user.load('staffRole', (q) => q.preload('permissions'))
    return this.#serializeStaff(user, serialize)
  }

  async resendInvitation({ params, serialize, agencyId }: HttpContext) {
    const user = await this.#findStaff(params.id, agencyId!)
    try {
      await this.#invites.resend(user)
      await user.load('staffRole', (q) => q.preload('permissions'))
      return this.#serializeStaff(user, serialize)
    } catch (error) {
      throw new Exception((error as Error).message, {
        status: 422,
        code: 'E_RESEND_INVITE',
      })
    }
  }

  /**
   * Permissions de l’utilisateur connecté (admin ou staff).
   */
  async myPermissions({ auth, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const permissions = await this.#permissions.getEffectivePermissionsMap(user)
    const catalog = await this.#permissions.listCatalog()
    return serialize({
      permissions,
      catalog: catalog.map((p) => ({
        code: p.code,
        module: p.module,
        label: p.label,
      })),
    })
  }
}
