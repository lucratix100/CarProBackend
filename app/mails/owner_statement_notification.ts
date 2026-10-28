import { BaseMail } from '@adonisjs/mail'

type OwnerStatementMailInput = {
  email: string
  fullName: string | null
  companyName: string
  from: string | null
  to: string | null
  totalNet: number
  totalExpenses: number
  balance: number
  filename: string
  pdf: Buffer
}

function formatDateFr(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatCfa(amount: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(amount)
    .replace(/[\u202f\u00a0]/g, ' ')} F CFA`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Relevé de compte propriétaire envoyé par e-mail (PDF en pièce jointe).
 */
export default class OwnerStatementNotification extends BaseMail {
  subject = 'Votre relevé de compte — mobiprofil'

  constructor(private payload: OwnerStatementMailInput) {
    super()
  }

  prepare() {
    const name = this.payload.fullName || this.payload.email
    this.message
      .to(this.payload.email)
      .html(this.#html(name))
      .text(this.#text(name))
      .attachData(this.payload.pdf, {
        filename: this.payload.filename,
        contentType: 'application/pdf',
      })
  }

  #period() {
    if (!this.payload.from && !this.payload.to) return 'Toute la période disponible'
    return `Du ${formatDateFr(this.payload.from)} au ${formatDateFr(this.payload.to)}`
  }

  #html(name: string) {
    return `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #0f172a; background: #f8fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">mobiprofil</p>
    <h1 style="margin: 0 0 16px; font-size: 22px;">Relevé de compte</h1>
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>
      Vous trouverez en pièce jointe votre relevé de compte
      <strong>${escapeHtml(this.payload.companyName)}</strong>
      pour la période <strong>${escapeHtml(this.#period())}</strong>.
    </p>
    <ul style="padding-left: 18px; color: #334155;">
      <li>Revenus nets : <strong>${escapeHtml(formatCfa(this.payload.totalNet))}</strong></li>
      <li>Dépenses : <strong>${escapeHtml(formatCfa(this.payload.totalExpenses))}</strong></li>
      <li>Solde : <strong>${escapeHtml(formatCfa(this.payload.balance))}</strong></li>
    </ul>
    <p style="font-size: 13px; color: #64748b;">Ce document est généré automatiquement. Pour toute question, contactez votre agence.</p>
  </div>
</body>
</html>`
  }

  #text(name: string) {
    return [
      `Bonjour ${name},`,
      '',
      `Votre relevé de compte ${this.payload.companyName} est joint à cet e-mail.`,
      `Période : ${this.#period()}`,
      `Revenus nets : ${formatCfa(this.payload.totalNet)}`,
      `Dépenses : ${formatCfa(this.payload.totalExpenses)}`,
      `Solde : ${formatCfa(this.payload.balance)}`,
      '',
      'mobiprofil',
    ].join('\n')
  }
}
