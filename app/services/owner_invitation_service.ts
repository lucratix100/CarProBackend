import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Owner from '#models/owner'
import OwnerInvitationNotification from '#mails/owner_invitation_notification'
import { CURRENT_TERMS_VERSION } from '#constants/mandate_terms'

type InviteOwnerPayload = {
  agencyId: number
  fullName: string
  email: string
  phone?: string | null
  city?: string | null
  notes?: string | null
}

export default class OwnerInvitationService {
  /**
   * Creates an invited owner account and sends the activation email.
   */
  async invite(payload: InviteOwnerPayload) {
    const invitationToken = randomBytes(32).toString('hex')
    const temporaryPassword = randomBytes(24).toString('hex')

    const { user, owner } = await db.transaction(async (trx) => {
      const createdUser = await User.create(
        {
          fullName: payload.fullName,
          email: payload.email.toLowerCase(),
          password: temporaryPassword,
          role: 'owner',
          status: 'invited',
          agencyId: payload.agencyId,
          invitationToken,
          invitationExpiresAt: DateTime.now().plus({ days: 7 }),
          passwordSetAt: null,
          termsVersion: null,
          termsAcceptedAt: null,
          termsAcceptedIp: null,
        },
        { client: trx }
      )

      const createdOwner = await Owner.create(
        {
          userId: createdUser.id,
          agencyId: payload.agencyId,
          phone: payload.phone ?? null,
          city: payload.city ?? null,
          notes: payload.notes ?? null,
          isActive: true,
        },
        { client: trx }
      )

      return { user: createdUser, owner: createdOwner }
    })

    const activationUrl = this.buildActivationUrl(invitationToken)
    await this.dispatchInvitationEmail(user, activationUrl)

    return { user, owner, activationUrl }
  }

  async resend(owner: Owner) {
    await owner.load('user')
    const user = owner.user

    if (user.status === 'revoked') {
      throw new Error('Ce compte propriétaire est révoqué.')
    }

    if (user.status === 'active' && user.passwordSetAt) {
      throw new Error('Ce propriétaire a déjà activé son compte.')
    }

    user.invitationToken = randomBytes(32).toString('hex')
    user.invitationExpiresAt = DateTime.now().plus({ days: 7 })
    user.status = 'invited'
    await user.save()

    const activationUrl = this.buildActivationUrl(user.invitationToken!)
    await this.dispatchInvitationEmail(user, activationUrl)

    return { user, owner, activationUrl }
  }

  async findValidInvitation(token: string) {
    const user = await User.query()
      .where('invitationToken', token)
      .where('role', 'owner')
      .where('status', 'invited')
      .preload('owner')
      .first()

    if (!user) return null
    if (!user.invitationExpiresAt || user.invitationExpiresAt < DateTime.now()) {
      return null
    }

    return user
  }

  async acceptInvitation(token: string, password: string, ip: string | null) {
    const user = await this.findValidInvitation(token)
    if (!user || !user.owner) {
      throw new Error('Invitation invalide ou expirée.')
    }

    user.password = password
    user.passwordSetAt = DateTime.now()
    user.status = 'active'
    user.invitationToken = null
    user.invitationExpiresAt = null
    user.termsVersion = CURRENT_TERMS_VERSION
    user.termsAcceptedAt = DateTime.now()
    user.termsAcceptedIp = ip
    await user.save()

    return { user, owner: user.owner }
  }

  buildActivationUrl(token: string) {
    const frontend = env.get('FRONTEND_URL').replace(/\/$/, '')
    return `${frontend}/invite/${token}`
  }

  private async dispatchInvitationEmail(user: User, activationUrl: string) {
    try {
      await mail.send(new OwnerInvitationNotification(user, activationUrl))
      logger.info({ to: user.email }, '[invitation] Email propriétaire envoyé')
    } catch (error) {
      logger.error(
        { err: error, to: user.email, activationUrl },
        '[invitation] Échec envoi email propriétaire — le compte a bien été créé'
      )
      // Ne pas faire échouer la création : le lien reste disponible (toast UI / resend)
    }
  }
}
