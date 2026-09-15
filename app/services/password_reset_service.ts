import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import User from '#models/user'
import PasswordResetNotification from '#mails/password_reset_notification'

const GENERIC_MESSAGE =
  'Si un compte actif correspond à cet email, un lien de réinitialisation vient d’être envoyé.'

/** Durée de validité du lien (heures). */
export const PASSWORD_RESET_HOURS = 24

export default class PasswordResetService {
  /**
   * Crée un token de reset et envoie le lien. Réponse toujours générique.
   */
  async requestReset(email: string) {
    const normalized = email.toLowerCase().trim()
    const user = await User.query().where('email', normalized).first()

    if (!user || !user.canLogin) {
      return { message: GENERIC_MESSAGE }
    }

    await this.issueResetForUser(user)

    return { message: GENERIC_MESSAGE }
  }

  /**
   * Émet un lien de reset pour un utilisateur authentifié (après vérif. mot de passe).
   */
  async issueResetForUser(user: User, hours = PASSWORD_RESET_HOURS) {
    user.passwordResetToken = randomBytes(32).toString('hex')
    user.passwordResetExpiresAt = DateTime.now().plus({ hours })
    await user.save()

    const resetUrl = this.buildResetUrl(user.passwordResetToken!)
    await this.dispatchEmail(user, resetUrl, hours)

    return {
      message: `Un lien de changement de mot de passe a été envoyé à ${user.email}. Il est valable ${hours} h.`,
      email: user.email,
      expiresInHours: hours,
    }
  }

  async findValidReset(token: string) {
    const user = await User.query().where('passwordResetToken', token).first()

    if (!user || !user.canLogin) return null
    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < DateTime.now()) {
      return null
    }

    return user
  }

  async resetPassword(token: string, password: string) {
    const user = await this.findValidReset(token)
    if (!user) {
      throw new Error('Lien de réinitialisation invalide ou expiré.')
    }

    user.password = password
    user.passwordSetAt = DateTime.now()
    user.passwordResetToken = null
    user.passwordResetExpiresAt = null
    await user.save()

    await User.accessTokens.deleteAll(user)

    return user
  }

  buildResetUrl(token: string) {
    return `${env.get('FRONTEND_URL').replace(/\/$/, '')}/reset-password/${token}`
  }

  private async dispatchEmail(user: User, resetUrl: string, hours: number) {
    try {
      await mail.send(new PasswordResetNotification(user, resetUrl, hours))
      logger.info({ to: user.email }, '[password-reset] Email lien de réinitialisation envoyé')
    } catch (error) {
      logger.error(
        { err: error, to: user.email, resetUrl },
        '[password-reset] Échec envoi email — le token a bien été créé'
      )
    }
  }
}
