import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Agency from '#models/agency'
import AdminInvitationNotification from '#mails/admin_invitation_notification'

type InviteAdminPayload = {
  agencyId: number
  fullName: string
  email: string
}

export default class AdminInvitationService {
  async invite(payload: InviteAdminPayload) {
    const agency = await Agency.findOrFail(payload.agencyId)
    if (!agency.isActive) {
      throw new Error('Cette agence est désactivée.')
    }

    const invitationToken = randomBytes(32).toString('hex')
    const temporaryPassword = randomBytes(24).toString('hex')

    const user = await db.transaction(async (trx) => {
      return User.create(
        {
          fullName: payload.fullName,
          email: payload.email.toLowerCase(),
          password: temporaryPassword,
          role: 'admin',
          status: 'invited',
          agencyId: agency.id,
          invitationToken,
          invitationExpiresAt: DateTime.now().plus({ days: 7 }),
          passwordSetAt: null,
          termsVersion: null,
          termsAcceptedAt: null,
          termsAcceptedIp: null,
        },
        { client: trx }
      )
    })

    const activationUrl = this.buildActivationUrl(invitationToken)
    await this.dispatchInvitationEmail(user, agency, activationUrl)

    return { user, agency, activationUrl }
  }

  async resend(user: User) {
    if (user.role !== 'admin') {
      throw new Error('Ce compte n’est pas un administrateur d’agence.')
    }
    if (user.status === 'revoked') {
      throw new Error('Ce compte administrateur est révoqué.')
    }
    if (user.status === 'active' && user.passwordSetAt) {
      throw new Error('Cet administrateur a déjà activé son compte.')
    }

    user.invitationToken = randomBytes(32).toString('hex')
    user.invitationExpiresAt = DateTime.now().plus({ days: 7 })
    user.status = 'invited'
    await user.save()

    const agency = user.agencyId ? await Agency.find(user.agencyId) : null
    const activationUrl = this.buildActivationUrl(user.invitationToken!)
    await this.dispatchInvitationEmail(user, agency, activationUrl)

    return { user, activationUrl }
  }

  async findValidInvitation(token: string) {
    const user = await User.query()
      .where('invitationToken', token)
      .where('role', 'admin')
      .where('status', 'invited')
      .preload('agency')
      .first()

    if (!user) return null
    if (!user.invitationExpiresAt || user.invitationExpiresAt < DateTime.now()) {
      return null
    }

    return user
  }

  async acceptInvitation(token: string, password: string) {
    const user = await this.findValidInvitation(token)
    if (!user) {
      throw new Error('Invitation invalide ou expirée.')
    }

    user.password = password
    user.passwordSetAt = DateTime.now()
    user.status = 'active'
    user.invitationToken = null
    user.invitationExpiresAt = null
    await user.save()

    return { user }
  }

  buildActivationUrl(token: string) {
    const frontend = env.get('FRONTEND_URL').replace(/\/$/, '')
    return `${frontend}/invite/${token}`
  }

  private async dispatchInvitationEmail(
    user: User,
    agency: Agency | null,
    activationUrl: string
  ) {
    try {
      await mail.send(
        new AdminInvitationNotification(user, activationUrl, agency?.name ?? null)
      )
      logger.info(
        { to: user.email, agency: agency?.name ?? null },
        '[invitation] Email admin agence envoyé'
      )
    } catch (error) {
      logger.error(
        { err: error, to: user.email, activationUrl },
        '[invitation] Échec envoi email admin — le compte a bien été créé'
      )
    }
  }
}
