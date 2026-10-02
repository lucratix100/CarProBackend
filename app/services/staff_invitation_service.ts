import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'
import User from '#models/user'
import Agency from '#models/agency'
import StaffInvitationNotification from '#mails/staff_invitation_notification'
import AgencyPlanService from '#services/agency_plan_service'
import PermissionService from '#services/permission_service'
import { CURRENT_PLATFORM_TERMS_VERSION } from '#constants/platform_terms'

export type InviteStaffPayload = {
  agencyId: number
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle?: string | null
  staffRoleId: number
  /** Permissions effectives souhaitées (personnalisation). Si omis = défauts du rôle. */
  permissionCodes?: string[]
}

export default class StaffInvitationService {
  #permissions = new PermissionService()
  #plan = new AgencyPlanService()

  async invite(payload: InviteStaffPayload) {
    const agency = await Agency.query().where('id', payload.agencyId).firstOrFail()
    if (!agency.isActive) {
      throw new Exception('Cette agence est désactivée.', {
        status: 422,
        code: 'E_AGENCY_INACTIVE',
      })
    }
    await this.#plan.assertCanInviteStaff(agency)

    const email = payload.email.toLowerCase().trim()
    const existing = await User.query().where('email', email).first()
    if (existing) {
      throw new Exception(
        `L’email ${email} est déjà utilisé par un compte existant.`,
        { status: 422, code: 'E_EMAIL_TAKEN' }
      )
    }

    const role = await this.#permissions.findRoleForAgency(payload.staffRoleId, agency.id)
    const firstName = payload.firstName.trim()
    const lastName = payload.lastName.trim()
    const fullName = `${firstName} ${lastName}`.trim()

    const invitationToken = randomBytes(32).toString('hex')
    const temporaryPassword = randomBytes(24).toString('hex')

    const user = await User.create({
      fullName,
      email,
      phone: payload.phone.trim(),
      password: temporaryPassword,
      role: 'staff',
      status: 'invited',
      agencyId: agency.id,
      staffRoleId: role.id,
      jobTitle: payload.jobTitle?.trim() || null,
      invitationToken,
      invitationExpiresAt: DateTime.now().plus({ days: 7 }),
      passwordSetAt: null,
      termsVersion: null,
      termsAcceptedAt: null,
      termsAcceptedIp: null,
    })

    if (payload.permissionCodes) {
      await this.#permissions.setUserPermissionOverrides(user, payload.permissionCodes)
    }

    const activationUrl = this.buildActivationUrl(invitationToken)
    await this.dispatchInvitationEmail(user, agency, activationUrl)

    await user.load('staffRole', (q) => q.preload('permissions'))
    return { user, agency, activationUrl, invitationToken }
  }

  async resend(user: User) {
    if (user.role !== 'staff') {
      throw new Exception('Ce compte n’est pas un collaborateur.', {
        status: 422,
        code: 'E_NOT_STAFF',
      })
    }
    if (user.status === 'revoked' || user.status === 'blocked') {
      throw new Exception('Ce compte est bloqué ou révoqué.', {
        status: 422,
        code: 'E_ACCOUNT_DISABLED',
      })
    }
    if (user.status === 'active' && user.passwordSetAt) {
      throw new Exception('Ce collaborateur a déjà activé son compte.', {
        status: 422,
        code: 'E_ALREADY_ACTIVE',
      })
    }

    const agency = user.agencyId ? await Agency.find(user.agencyId) : null
    if (agency?.staffPaused) {
      throw new Exception('L’équipe est en pause. Les invitations sont fermées.', {
        status: 422,
        code: 'E_STAFF_PAUSED',
      })
    }

    user.invitationToken = randomBytes(32).toString('hex')
    user.invitationExpiresAt = DateTime.now().plus({ days: 7 })
    user.status = 'invited'
    await user.save()

    const activationUrl = this.buildActivationUrl(user.invitationToken!)
    await this.dispatchInvitationEmail(user, agency, activationUrl)
    return { user, activationUrl }
  }

  async findValidInvitation(token: string) {
    const user = await User.query()
      .where('invitationToken', token)
      .where('role', 'staff')
      .where('status', 'invited')
      .preload('agency')
      .preload('staffRole')
      .first()

    if (!user) return null
    if (user.agency?.staffPaused) {
      const floor = DateTime.now().plus({ days: 7 })
      if (!user.invitationExpiresAt || user.invitationExpiresAt < floor) {
        user.invitationExpiresAt = floor
        await user.save()
      }
      return user
    }
    if (!user.invitationExpiresAt || user.invitationExpiresAt < DateTime.now()) {
      return null
    }
    return user
  }

  async acceptInvitation(token: string, password: string, ip: string | null) {
    const user = await this.findValidInvitation(token)
    if (!user) {
      throw new Exception('Invitation invalide ou expirée.', {
        status: 422,
        code: 'E_INVALID_INVITATION',
      })
    }

    if (user.agency?.staffPaused) {
      throw new Exception(
        'L’équipe de cette agence est en pause. Vous pourrez activer votre compte lorsque l’accès sera rétabli.',
        { status: 422, code: 'E_STAFF_PAUSED' }
      )
    }

    user.password = password
    user.passwordSetAt = DateTime.now()
    user.status = 'active'
    user.invitationToken = null
    user.invitationExpiresAt = null
    user.termsVersion = CURRENT_PLATFORM_TERMS_VERSION
    user.termsAcceptedAt = DateTime.now()
    user.termsAcceptedIp = ip
    await user.save()

    return { user }
  }

  buildActivationUrl(token: string) {
    const frontend = env.get('FRONTEND_URL').replace(/\/$/, '')
    return `${frontend}/invite/${token}`
  }

  async dispatchInvitationEmail(user: User, agency: Agency | null, activationUrl: string) {
    try {
      await mail.send(
        new StaffInvitationNotification(user, activationUrl, agency?.name ?? null)
      )
      logger.info(
        { to: user.email, agency: agency?.name ?? null },
        '[invitation] Email collaborateur envoyé'
      )
    } catch (error) {
      logger.error(
        { err: error, to: user.email, activationUrl },
        '[invitation] Échec envoi email collaborateur — le compte a bien été créé'
      )
    }
  }

  /** Invalide toutes les sessions API du collaborateur. */
  async revokeAllSessions(user: User) {
    await db.from('auth_access_tokens').where('tokenable_id', user.id).delete()
  }
}
