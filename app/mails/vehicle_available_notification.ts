import { BaseMail } from '@adonisjs/mail'

type VehicleAvailableMailInput = {
  email: string
  fullName: string | null
  vehicleLabel: string
  agencyName: string | null
  vehicleUrl: string
  dailyPriceLabel: string
}

/**
 * Alerte client marketplace : véhicule de nouveau disponible aujourd’hui.
 */
export default class VehicleAvailableNotification extends BaseMail {
  subject = 'Bonne nouvelle — votre voiture favorite est disponible'

  constructor(private payload: VehicleAvailableMailInput) {
    super()
  }

  prepare() {
    const name = this.payload.fullName || this.payload.email
    this.message
      .to(this.payload.email)
      .html(this.#html(name))
      .text(this.#text(name))
  }

  #html(name: string) {
    const agency = this.payload.agencyName
      ? ` chez <strong>${escapeHtml(this.payload.agencyName)}</strong>`
      : ''
    return `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #0f172a; background: #f8fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">carPro</p>
    <h1 style="margin: 0 0 16px; font-size: 22px;">Véhicule disponible</h1>
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>
      <strong>${escapeHtml(this.payload.vehicleLabel)}</strong>${agency}
      est de nouveau disponible aujourd’hui (${escapeHtml(this.payload.dailyPriceLabel)} / jour).
    </p>
    <p style="margin: 28px 0;">
      <a href="${this.payload.vehicleUrl}" style="display: inline-block; background: #3f3f6d; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
        Voir et réserver
      </a>
    </p>
    <p style="font-size: 13px; color: #64748b;">Vous recevez cet email car vous avez activé l’alerte « Me prévenir si dispo » sur carPro.</p>
  </div>
</body>
</html>`
  }

  #text(name: string) {
    return [
      `Bonjour ${name},`,
      '',
      `${this.payload.vehicleLabel}${this.payload.agencyName ? ` (${this.payload.agencyName})` : ''} est disponible aujourd’hui.`,
      `Tarif : ${this.payload.dailyPriceLabel} / jour`,
      '',
      `Voir et réserver : ${this.payload.vehicleUrl}`,
      '',
      '— carPro',
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
