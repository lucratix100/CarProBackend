import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'

/**
 * Lien pour définir un nouveau mot de passe après « Mot de passe oublié ».
 */
export default class PasswordResetNotification extends BaseMail {
  subject = 'Réinitialisez votre mot de passe — Profil Car Service'

  constructor(
    private user: User,
    private resetUrl: string,
    private expiresInHours = 24
  ) {
    super()
  }

  prepare() {
    const name = this.user.fullName || this.user.email

    this.message.to(this.user.email).html(this.#html(name)).text(this.#text(name))
  }

  #expiryLabel() {
    const h = this.expiresInHours
    return h === 1 ? '1 heure' : `${h} heures`
  }

  #html(name: string) {
    const expiry = this.#expiryLabel()
    return `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #0f172a; background: #f8fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">Profil Car Service</p>
    <h1 style="margin: 0 0 16px; font-size: 22px;">Réinitialisation du mot de passe</h1>
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
    <p style="margin: 28px 0;">
      <a href="${this.resetUrl}" style="display: inline-block; background: #0f4a42; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
        Définir un nouveau mot de passe
      </a>
    </p>
    <p style="font-size: 13px; color: #64748b;">Ce lien expire dans ${expiry}. Si le bouton ne fonctionne pas, copiez cette URL :</p>
    <p style="font-size: 12px; word-break: break-all; color: #334155;">${this.resetUrl}</p>
    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet email. Votre mot de passe actuel reste inchangé.</p>
  </div>
</body>
</html>`
  }

  #text(name: string) {
    const expiry = this.#expiryLabel()
    return [
      `Bonjour ${name},`,
      '',
      'Vous avez demandé la réinitialisation de votre mot de passe Profil Car Service.',
      `Définissez-en un nouveau via ce lien (expire dans ${expiry}) :`,
      this.resetUrl,
      '',
      'Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.',
    ].join('\n')
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
