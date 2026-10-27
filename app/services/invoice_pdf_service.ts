import PDFDocument from 'pdfkit'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import type Invoice from '#models/invoice'
import Agency from '#models/agency'
import Setting from '#models/setting'
import { invoiceAmounts } from '#services/finance_service'
import { resolvePublicLogoPath } from '#services/agency_logo_upload_service'
import { headerTheme } from '#services/document_header_color'
import { preparePdfLogo } from '#services/image_compress_service'

const C = {
  brand: '#0f4a42',
  brandSoft: '#e7f2f0',
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  line: '#cbd5e1',
  lineSoft: '#e2e8f0',
  white: '#ffffff',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  warning: '#b45309',
  warningBg: '#fffbeb',
  success: '#166534',
  successBg: '#f0fdf4',
} as const

const M = { left: 40, right: 40, top: 32, bottom: 36 }
const PAGE_W = 595.28
const PAGE_H = 841.89
const CONTENT_W = PAGE_W - M.left - M.right

type Doc = InstanceType<typeof PDFDocument>

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(value)
    .replace(/[\u202f\u00a0]/g, ' ')
}

function formatCfa(amount: number) {
  return `${formatNumber(amount)} F CFA`
}

function formatDateFr(value: DateTime | string | null | undefined) {
  if (!value) return '—'
  const dt = typeof value === 'string' ? DateTime.fromISO(value) : value
  if (!dt.isValid) return '—'
  return dt.setLocale('fr').toFormat('dd MMMM yyyy')
}

function displayValue(value: string | null | undefined) {
  if (!value) return '—'
  const trimmed = value.trim()
  if (!trimmed) return '—'
  const lower = trimmed.toLowerCase()
  if (lower === 'à compléter' || lower === 'a completer') return '—'
  return trimmed
}

function statusColors(status: string) {
  switch (status) {
    case 'Payée':
      return { bg: C.successBg, fg: C.success }
    case 'En retard':
      return { bg: C.dangerBg, fg: C.danger }
    case 'Partiellement payée':
      return { bg: C.warningBg, fg: C.warning }
    default:
      return { bg: C.brandSoft, fg: C.brand }
  }
}

function text(doc: Doc, value: string, x: number, y: number, opts: PDFKit.Mixins.TextOptions = {}) {
  const px = doc.x
  const py = doc.y
  doc.text(value, x, y, opts)
  doc.x = px
  doc.y = py
}

function hline(doc: Doc, x: number, y: number, w: number, color: string = C.lineSoft) {
  doc.save()
  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(0.6).stroke(color)
  doc.restore()
}

function ensureSpace(doc: Doc, y: number, needed: number) {
  if (y + needed <= PAGE_H - M.bottom - 18) return y
  doc.addPage()
  return M.top
}

function sectionTitle(doc: Doc, title: string, y: number) {
  const cy = ensureSpace(doc, y, 28)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.brand)
  text(doc, title.toUpperCase(), M.left, cy, { width: CONTENT_W, characterSpacing: 0.4 })
  hline(doc, M.left, cy + 14, CONTENT_W, C.brand)
  return cy + 22
}

function drawLogo(
  doc: Doc,
  logo: Buffer | null,
  logoX: number,
  logoY: number,
  logoSize: number,
  badge: string,
  badgeInk: string
) {
  let usedCustomLogo = false
  if (logo) {
    doc.save()
    try {
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 6).clip()
      doc.image(logo, logoX, logoY, {
        fit: [logoSize, logoSize],
        align: 'center',
        valign: 'center',
      })
      usedCustomLogo = true
    } catch {
      usedCustomLogo = false
    } finally {
      doc.restore()
    }
  }

  if (!usedCustomLogo) {
    doc.save()
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 6).fill(badge)
    doc.restore()
    doc.font('Helvetica-Bold').fontSize(11).fillColor(badgeInk)
    text(doc, 'PCS', logoX + 7, logoY + 12)
  }
}

function drawHeader(
  doc: Doc,
  companyName: string,
  invoiceRef: string,
  issuedOn: DateTime,
  logo: Buffer | null,
  headerColor: string | null
) {
  const theme = headerTheme(headerColor)
  const y = M.top
  const h = 62
  const logoX = M.left
  const logoY = y + 12
  const logoSize = 36

  doc.save()
  doc.rect(0, 0, PAGE_W, y + h).fill(theme.background)
  doc.restore()

  drawLogo(doc, logo, logoX, logoY, logoSize, theme.badge, theme.badgeInk)

  doc.font('Helvetica-Bold').fontSize(14).fillColor(theme.ink)
  text(doc, companyName, M.left + 48, y + 14)
  doc.font('Helvetica').fontSize(8).fillColor(theme.muted)
  text(doc, 'Location de véhicules · Dakar, Sénégal', M.left + 48, y + 34)

  doc.font('Helvetica-Bold').fontSize(12).fillColor(theme.ink)
  text(doc, 'FACTURE', M.left, y + 14, { width: CONTENT_W, align: 'right' })
  doc.font('Helvetica').fontSize(8).fillColor(theme.muted)
  text(doc, invoiceRef, M.left, y + 32, { width: CONTENT_W, align: 'right' })
  text(doc, formatDateFr(issuedOn), M.left, y + 44, { width: CONTENT_W, align: 'right' })

  return y + h + 16
}

function field(doc: Doc, label: string, value: string, x: number, y: number, labelW: number, valueW: number) {
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
  text(doc, label, x, y, { width: labelW })
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink)
  text(doc, value, x + labelW, y, { width: valueW })
  return y + 13
}

function drawParties(
  doc: Doc,
  y: number,
  clientRows: Array<{ label: string; value: string }>,
  invoiceRows: Array<{ label: string; value: string }>,
  status: string
) {
  const gap = 20
  const colW = (CONTENT_W - gap) / 2
  const leftTitle = sectionTitle(doc, '01 — Client', y)
  const rightX = M.left + colW + gap
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.brand)
  text(doc, '02 — FACTURE', rightX, leftTitle - 22, { width: colW, characterSpacing: 0.4 })
  hline(doc, rightX, leftTitle - 8, colW, C.brand)

  let left = leftTitle
  for (const row of clientRows) {
    left = field(doc, row.label, row.value, M.left, left, 72, colW - 72)
  }

  let right = leftTitle
  for (const row of invoiceRows) {
    right = field(doc, row.label, row.value, rightX, right, 78, colW - 78)
  }

  const colors = statusColors(status)
  const badgeW = 110
  const badgeY = right
  doc.save()
  doc.roundedRect(rightX, badgeY, badgeW, 16, 3).fill(colors.bg)
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.fg)
  text(doc, status, rightX, badgeY + 4, { width: badgeW, align: 'center' })

  return Math.max(left, badgeY + 22) + 8
}

function drawLine(
  doc: Doc,
  y: number,
  description: string,
  amountHt: number
) {
  let cy = sectionTitle(doc, '03 — Désignation', y)
  cy = ensureSpace(doc, cy, 36)

  doc.save()
  doc.rect(M.left, cy, CONTENT_W, 18).fill(C.brand)
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
  text(doc, 'DÉSIGNATION', M.left + 8, cy + 5, { width: CONTENT_W * 0.7 })
  text(doc, 'MONTANT HT', M.left + 8, cy + 5, { width: CONTENT_W - 16, align: 'right' })
  cy += 18

  doc.save()
  doc.rect(M.left, cy, CONTENT_W, 28).fill('#f8fafc')
  doc.restore()
  doc.font('Helvetica').fontSize(8.5).fillColor(C.ink)
  text(doc, description, M.left + 8, cy + 8, { width: CONTENT_W * 0.68 })
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink)
  text(doc, formatCfa(amountHt), M.left + 8, cy + 8, { width: CONTENT_W - 16, align: 'right' })

  return cy + 40
}

function drawTotals(
  doc: Doc,
  y: number,
  rows: Array<{ label: string; value: string; emphasize?: boolean }>
) {
  let cy = ensureSpace(doc, y, rows.length * 16 + 8)
  rows.forEach((row, i) => {
    const ry = cy + i * 16
    if (row.emphasize) {
      doc.save()
      doc.rect(M.left, ry - 3, CONTENT_W, 16).fill(C.brandSoft)
      doc.restore()
    }
    doc
      .font(row.emphasize ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8.5)
      .fillColor(row.emphasize ? C.brand : C.body)
    text(doc, row.label, M.left + 8, ry, { width: CONTENT_W * 0.55 })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(row.emphasize ? C.brand : C.ink)
    text(doc, row.value, M.left + 8, ry, { width: CONTENT_W - 16, align: 'right' })
  })
  return cy + rows.length * 16 + 12
}

function drawPayments(
  doc: Doc,
  y: number,
  payments: Array<{ paidOn: string; method: string; reference: string; amount: string }>
) {
  let cy = sectionTitle(doc, '04 — Paiements', y)
  if (payments.length === 0) {
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    text(doc, 'Aucun paiement enregistré.', M.left, cy)
    return cy + 18
  }

  cy = ensureSpace(doc, cy, 18)
  doc.save()
  doc.rect(M.left, cy, CONTENT_W, 16).fill('#f1f5f9')
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
  const cols = [M.left + 8, M.left + 120, M.left + 250, M.left + 8]
  text(doc, 'DATE', cols[0], cy + 4, { width: 100 })
  text(doc, 'MODE', cols[1], cy + 4, { width: 120 })
  text(doc, 'RÉFÉRENCE', cols[2], cy + 4, { width: 140 })
  text(doc, 'MONTANT', cols[3], cy + 4, { width: CONTENT_W - 16, align: 'right' })
  cy += 16

  for (const payment of payments) {
    cy = ensureSpace(doc, cy, 16)
    doc.font('Helvetica').fontSize(8).fillColor(C.ink)
    text(doc, payment.paidOn, cols[0], cy + 3, { width: 100 })
    text(doc, payment.method, cols[1], cy + 3, { width: 120 })
    text(doc, payment.reference, cols[2], cy + 3, { width: 150 })
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink)
    text(doc, payment.amount, cols[3], cy + 3, { width: CONTENT_W - 16, align: 'right' })
    hline(doc, M.left, cy + 15, CONTENT_W)
    cy += 16
  }

  return cy + 8
}

function drawFooter(doc: Doc, companyName: string) {
  const y = PAGE_H - M.bottom
  hline(doc, M.left, y - 8, CONTENT_W, C.lineSoft)
  doc.font('Helvetica').fontSize(6.5).fillColor(C.muted)
  text(doc, `${companyName} · Facture générée automatiquement — à conserver`, M.left, y - 4, {
    width: CONTENT_W,
    align: 'center',
  })
}

export default class InvoicePdfService {
  async generate(invoice: Invoice) {
    if (!invoice.client) await invoice.load('client')
    if (!invoice.$preloaded.payments) {
      await invoice.load('payments', (query) => query.orderBy('paidOn', 'asc').orderBy('id', 'asc'))
    }
    if (invoice.rentalId && !invoice.rental) {
      await invoice.load('rental', (query) => query.preload('vehicle'))
    } else if (invoice.rental && !invoice.rental.vehicle) {
      await invoice.rental.load('vehicle')
    }

    const settings = await Setting.current(invoice.agencyId)
    const agency = await Agency.find(invoice.agencyId)
    const publicLogoPath = agency && settings ? resolvePublicLogoPath(agency, settings) : null
    const logoAbsolutePath = publicLogoPath ? app.makePath(publicLogoPath) : null
    const amounts = invoiceAmounts(Number(invoice.amountHt), Number(settings.tvaRate))
    const payments = [...(invoice.payments ?? [])].sort((a, b) => {
      const left = a.paidOn?.toISODate() ?? ''
      const right = b.paidOn?.toISODate() ?? ''
      return left.localeCompare(right) || a.id - b.id
    })
    const amountPaid = payments.reduce(
      (sum, payment) => (payment.cancelledAt ? sum : sum + Number(payment.amount)),
      0
    )
    const balance = Math.max(0, amounts.ttc - amountPaid)
    const invoiceRef = `PCS-FAC-${String(invoice.id).padStart(5, '0')}`
    const client = invoice.client
    const rental = invoice.rental
    const vehicleLabel = rental?.vehicle
      ? `${rental.vehicle.brand} ${rental.vehicle.model}${rental.vehicle.plate ? ` · ${rental.vehicle.plate}` : ''}`
      : null

    const clientRows = [
      { label: 'Nom', value: displayValue(client.fullName) },
      { label: 'Téléphone', value: displayValue(client.phone) },
      { label: 'Email', value: displayValue(client.email) },
      { label: 'Ville', value: displayValue(client.city) },
    ]
    const invoiceRows = [
      { label: 'N° facture', value: invoiceRef },
      { label: 'Émise le', value: formatDateFr(invoice.issuedOn) },
      {
        label: 'Location',
        value: rental ? `#${rental.id}${vehicleLabel ? ` · ${vehicleLabel}` : ''}` : '—',
      },
    ]
    const designation =
      displayValue(invoice.description) !== '—'
        ? displayValue(invoice.description)
        : vehicleLabel
          ? `Location ${vehicleLabel}`
          : 'Prestation de location'

    const tvaPct = Math.round(amounts.tvaRate * 100)
    const totalRows = [
      { label: 'Total HT', value: formatCfa(amounts.amountHt) },
      { label: `TVA (${tvaPct} %)`, value: formatCfa(amounts.tva) },
      { label: 'Total TTC', value: formatCfa(amounts.ttc), emphasize: true },
      { label: 'Montant réglé', value: formatCfa(amountPaid) },
      {
        label: balance > 0 ? 'Reste à payer' : 'Solde',
        value: formatCfa(balance),
        emphasize: true,
      },
    ]
    const paymentRows = payments.map((payment) => ({
      paidOn: formatDateFr(payment.paidOn),
      method: payment.cancelledAt
        ? `${displayValue(payment.method)} · Annulé`
        : displayValue(payment.method),
      reference: displayValue(payment.reference),
      amount: formatCfa(Number(payment.amount)),
    }))

    const logo = await preparePdfLogo(logoAbsolutePath)
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        autoFirstPage: true,
        info: {
          Title: `Facture ${invoiceRef}`,
          Author: settings.companyName,
        },
      })
      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk as Buffer))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      let y = drawHeader(
        doc,
        settings.companyName,
        invoiceRef,
        invoice.issuedOn,
        logo,
        settings.documentHeaderColor
      )
      y = drawParties(doc, y, clientRows, invoiceRows, invoice.status)
      y = drawLine(doc, y, designation, amounts.amountHt)
      y = drawTotals(doc, y, totalRows)
      drawPayments(doc, y, paymentRows)
      drawFooter(doc, settings.companyName)
      doc.end()
    })
  }
}
