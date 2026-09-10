import { BaseMail } from '@adonisjs/mail'

type BookingDecisionMailInput = {
  email: string
  fullName: string | null
  vehicleLabel: string
  agencyName: string | null
  startDate: string
  endDate: string
  decision: 'approved' | 'rejected'
  reason?: string | null
  reservationsUrl: string
}

function formatDateFr(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Décision agence sur une demande marketplace (validée ou refusée).
 */
export default class MarketplaceBookingDecisionNotification extends BaseMail {
  constructor(private payload: BookingDecisionMailInput) {
    super()
    this.subject =
      payload.decision === 'approved'
        ? 'Votre réservation est confirmée'
        : 'Votre demande de réservation a été refusée'
  }

  prepare() {
    const name = this.payload.fullName || this.payload.email
    this.message.to(this.payload.email).html(this.#html(name)).text(this.#text(name))
  }

  #period() {
    return `${formatDateFr(this.payload.startDate)} → ${formatDateFr(this.payload.endDate)}`
  }

  #html(name: string) {
    const approved = this.payload.decision === 'approved'
    const agency = this.payload.agencyName
      ? ` auprès de <strong>${escapeHtml(this.payload.agencyName)}</strong>`
      : ''
    const reason =
      !approved && this.payload.reason
        ? `<p><strong>Motif :</strong> ${escapeHtml(this.payload.reason)}</p>`
        : ''

    return `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #0f172a; background: #f8fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">carPro</p>
    <h1 style="margin: 0 0 16px; font-size: 22px;">${
      approved ? 'Réservation confirmée' : 'Demande refusée'
    }</h1>
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>
      Votre demande pour <strong>${escapeHtml(this.payload.vehicleLabel)}</strong>${agency}
      (${escapeHtml(this.#period())}) a été
      <strong>${approved ? 'acceptée' : 'refusée'}</strong> par l’agence.
    </p>
    ${reason}
    ${
      approved
        ? '<p>Présentez-vous à l’agence le jour du départ avec votre permis et votre CIN.</p>'
        : '<p>Vous pouvez consulter d’autres véhicules sur carPro.</p>'
    }
    <p style="margin: 28px 0;">
      <a href="${this.payload.reservationsUrl}" style="display: inline-block; background: #3f3f6d; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">
        Voir mes réservations
      </a>
    </p>
  </div>
</body>
</html>`
  }

  #text(name: string) {
    const approved = this.payload.decision === 'approved'
    return [
      `Bonjour ${name},`,
      '',
      `Votre demande pour ${this.payload.vehicleLabel} (${this.#period()}) a été ${
        approved ? 'acceptée' : 'refusée'
      }.`,
      this.payload.agencyName ? `Agence : ${this.payload.agencyName}` : '',
      !approved && this.payload.reason ? `Motif : ${this.payload.reason}` : '',
      '',
      `Mes réservations : ${this.payload.reservationsUrl}`,
      '',
      '— carPro',
    ]
      .filter(Boolean)
      .join('\n')
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
