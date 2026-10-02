import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'

/**
 * Invitation collaborateur d’agence.
 */
export default class StaffInvitationNotification extends BaseMail {
  subject = 'Activez votre compte collaborateur — Profil Car Service'

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
    <h1 style="margin: 0 0 16px; font-size: 22px;">Activez votre compte collaborateur</h1>
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>Vous êtes invité(e) à rejoindre l’agence <strong>${escapeHtml(agency)}</strong> sur Profil Car Service. Définissez un mot de passe personnel et acceptez les conditions pour activer votre accès.</p>
    <p style="margin: 28px 0;">
      <a href="${this.activationUrl}" style="display: inline-block; background: #0f4a42; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
        Activer mon compte
      </a>
    </p>
    <p style="font-size: 13px; color: #64748b;">Ce lien expire dans 7 jours. Ne partagez jamais vos identifiants.</p>
    <p style="font-size: 12px; word-break: break-all; color: #334155;">${this.activationUrl}</p>
  </div>
</body>
</html>`
  }

  #text(name: string, agency: string) {
    return [
      `Bonjour ${name},`,
      '',
      `Vous êtes invité(e) à rejoindre l’agence « ${agency} » sur Profil Car Service.`,
      'Activez votre compte via ce lien :',
      this.activationUrl,
      '',
      'Ce lien expire dans 7 jours. Ne partagez jamais vos identifiants.',
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
