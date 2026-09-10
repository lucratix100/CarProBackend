import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'

/**
 * Invitation administrateur d’agence.
 */
export default class AdminInvitationNotification extends BaseMail {
  subject = 'Activez votre accès administrateur — Profil Car Service'

  constructor(
    private user: User,
    private activationUrl: string,
    private agencyName: string | null
  ) {
    super()
  }

  prepare() {
    const name = this.user.fullName || this.user.email
    const agency = this.agencyName || 'votre agence'

    this.message.to(this.user.email).html(this.#html(name, agency)).text(this.#text(name, agency))
  }

  #html(name: string, agency: string) {
    return `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #0f172a; background: #f8fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">Profil Car Service</p>
    <h1 style="margin: 0 0 16px; font-size: 22px;">Activez votre accès administrateur</h1>
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>Vous êtes invité(e) à administrer l’agence <strong>${escapeHtml(agency)}</strong>. Définissez votre mot de passe pour accéder à la console de gestion.</p>
    <p style="margin: 28px 0;">
      <a href="${this.activationUrl}" style="display: inline-block; background: #0f4a42; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
        Activer mon compte
      </a>
    </p>
    <p style="font-size: 13px; color: #64748b;">Ce lien expire dans 7 jours. Si le bouton ne fonctionne pas, copiez cette URL :</p>
    <p style="font-size: 12px; word-break: break-all; color: #334155;">${this.activationUrl}</p>
  </div>
</body>
</html>`
  }

  #text(name: string, agency: string) {
    return [
      `Bonjour ${name},`,
      '',
      `Vous êtes invité(e) à administrer l’agence « ${agency} ».`,
      'Activez votre compte administrateur via ce lien :',
      this.activationUrl,
      '',
      'Ce lien expire dans 7 jours.',
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
