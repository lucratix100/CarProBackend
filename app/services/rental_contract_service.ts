import PDFDocument from 'pdfkit'
import { DateTime } from 'luxon'
import type Rental from '#models/rental'
import Setting from '#models/setting'
import { rentalFinancials } from '#services/finance_service'

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

/** A4 usable area */
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
    case 'En cours':
      return { bg: C.brandSoft, fg: C.brand }
    case 'Terminée':
      return { bg: C.successBg, fg: C.success }
    case 'Annulée':
      return { bg: C.dangerBg, fg: C.danger }
    default:
      return { bg: C.warningBg, fg: C.warning }
  }
}

function text(doc: Doc, value: string, x: number, y: number, opts: PDFKit.Mixins.TextOptions = {}) {
  const px = doc.x
  const py = doc.y
  doc.text(value, x, y, opts)
  doc.x = px
  doc.y = py
}

function hline(doc: Doc, x: number, y: number, w: number, color = C.lineSoft) {
  doc.save()
  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(0.6).stroke(color)
  doc.restore()
}

function sectionTitle(doc: Doc, title: string, x: number, y: number, w: number) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.brand)
  text(doc, title.toUpperCase(), x, y, { width: w, characterSpacing: 0.4 })
  hline(doc, x, y + 14, w, C.brand)
  return y + 20
}

function field(
  doc: Doc,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
  valueW: number
) {
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
  text(doc, label, x, y, { width: labelW })
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink)
  text(doc, value, x + labelW, y, { width: valueW })
  return y + 13
}

function drawHeader(
  doc: Doc,
  settings: Setting,
  contractRef: string,
  issuedOn: DateTime,
  cancelled: boolean
) {
  const y = M.top
  const h = 62

  doc.save()
  doc.rect(0, 0, PAGE_W, y + h).fill(C.brand)
  doc.restore()

  // Logo mark
  doc.save()
  doc.roundedRect(M.left, y + 12, 36, 36, 6).fill('#1a6b5f')
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white)
  text(doc, 'PCS', M.left + 7, y + 24)

  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.white)
  text(doc, settings.companyName, M.left + 48, y + 14)
  doc.font('Helvetica').fontSize(8).fillColor('#c5e0db')
  text(doc, 'Location de véhicules · Dakar, Sénégal', M.left + 48, y + 34)

  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white)
  text(doc, 'CONTRAT DE LOCATION', M.left, y + 14, {
    width: CONTENT_W,
    align: 'right',
  })
  doc.font('Helvetica').fontSize(8).fillColor('#c5e0db')
  text(doc, contractRef, M.left, y + 32, { width: CONTENT_W, align: 'right' })
  text(doc, formatDateFr(issuedOn), M.left, y + 44, { width: CONTENT_W, align: 'right' })

  if (cancelled) {
    doc.save()
    doc.roundedRect(PAGE_W - M.right - 68, y + h - 18, 68, 14, 3).fill(C.dangerBg)
    doc.restore()
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.danger)
    text(doc, 'ANNULÉ', PAGE_W - M.right - 68, y + h - 15, { width: 68, align: 'center' })
  }

  return y + h + 16
}

function drawPartiesIntro(doc: Doc, y: number, company: string, client: string) {
  doc.font('Helvetica').fontSize(8.5).fillColor(C.body)
  text(
    doc,
    `Contrat conclu entre ${company} (ci-après « le Loueur ») et ${client} (ci-après « le Locataire »), relatif à la location du véhicule désigné ci-après.`,
    M.left,
    y,
    { width: CONTENT_W, align: 'justify', lineGap: 1.5 }
  )
  return y + 28
}

function drawClientBlock(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  rows: Array<{ label: string; value: string }>
) {
  let cy = sectionTitle(doc, '01 — Locataire', x, y, w)
  const labelW = 62
  for (const row of rows) {
    cy = field(doc, row.label, row.value, x, cy, labelW, w - labelW)
  }
  return cy
}

function drawVehicleBlock(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  rows: Array<{ label: string; value: string }>
) {
  let cy = sectionTitle(doc, '02 — Véhicule loué', x, y, w)
  const labelW = 72
  for (const row of rows) {
    cy = field(doc, row.label, row.value, x, cy, labelW, w - labelW)
  }
  return cy
}

function drawDuration(
  doc: Doc,
  y: number,
  start: string,
  end: string,
  days: number,
  status: string
) {
  let cy = sectionTitle(doc, '03 — Durée de la location', M.left, y, CONTENT_W)

  const boxH = 36
  doc.save()
  doc.roundedRect(M.left, cy, CONTENT_W, boxH, 4).fill(C.brandSoft)
  doc.restore()

  const col = CONTENT_W / 4
  const items = [
    { label: 'Début', value: start },
    { label: 'Fin', value: end },
    { label: 'Durée', value: `${days} jour${days > 1 ? 's' : ''}` },
    { label: 'Statut', value: status },
  ]

  items.forEach((item, i) => {
    const ix = M.left + i * col + 10
    doc.font('Helvetica').fontSize(7).fillColor(C.muted)
    text(doc, item.label.toUpperCase(), ix, cy + 7, { width: col - 16 })
    if (i === 3) {
      const colors = statusColors(status)
      doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.fg)
    } else {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink)
    }
    text(doc, item.value, ix, cy + 19, { width: col - 16 })
  })

  return cy + boxH + 14
}

function drawFinance(
  doc: Doc,
  y: number,
  rows: Array<{ label: string; value: string; emphasize?: boolean }>
) {
  let cy = sectionTitle(doc, '04 — Conditions financières', M.left, y, CONTENT_W)

  rows.forEach((row, i) => {
    const ry = cy + i * 16
    if (row.emphasize) {
      doc.save()
      doc.rect(M.left, ry - 3, CONTENT_W, 16).fill(C.brandSoft)
      doc.restore()
    } else if (i % 2 === 1) {
      doc.save()
      doc.rect(M.left, ry - 3, CONTENT_W, 16).fill('#f8fafc')
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

function drawClauses(doc: Doc, y: number, clauses: string[]) {
  let cy = sectionTitle(doc, '05 — Conditions générales', M.left, y, CONTENT_W)
  const colW = (CONTENT_W - 16) / 2
  const left = clauses.slice(0, 3)
  const right = clauses.slice(3)

  left.forEach((clause, i) => {
    const iy = cy + i * 22
    doc.save()
    doc.circle(M.left + 4, iy + 4, 1.6).fill(C.brand)
    doc.restore()
    doc.font('Helvetica').fontSize(7.5).fillColor(C.body)
    text(doc, clause, M.left + 12, iy, { width: colW - 8, lineGap: 1 })
  })
  right.forEach((clause, i) => {
    const iy = cy + i * 22
    const ix = M.left + colW + 16
    doc.save()
    doc.circle(ix + 4, iy + 4, 1.6).fill(C.brand)
    doc.restore()
    doc.font('Helvetica').fontSize(7.5).fillColor(C.body)
    text(doc, clause, ix + 12, iy, { width: colW - 8, lineGap: 1 })
  })

  return cy + 3 * 22 + 10
}

function drawNotes(doc: Doc, y: number, notes: string) {
  let cy = sectionTitle(doc, 'Observations', M.left, y, CONTENT_W)
  doc.font('Helvetica').fontSize(8).fillColor(C.body)
  text(doc, notes, M.left, cy, { width: CONTENT_W, lineGap: 1 })
  return cy + 22
}

function drawSignatures(doc: Doc, y: number, issuedOn: DateTime, clientName: string, company: string) {
  let cy = sectionTitle(doc, '06 — Signatures', M.left, y, CONTENT_W)

  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
  text(doc, `Fait à Dakar, le ${formatDateFr(issuedOn)}`, M.left, cy)
  cy += 16

  const boxW = (CONTENT_W - 24) / 2
  const boxH = 72

  // Locataire
  doc.save()
  doc.roundedRect(M.left, cy, boxW, boxH, 4).lineWidth(0.8).stroke(C.line)
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink)
  text(doc, 'Le Locataire', M.left + 10, cy + 8)
  doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
  text(doc, clientName, M.left + 10, cy + 20, { width: boxW - 20 })
  hline(doc, M.left + 10, cy + boxH - 18, boxW - 20, C.line)
  doc.font('Helvetica').fontSize(6.5).fillColor(C.muted)
  text(doc, 'Signature', M.left + 10, cy + boxH - 14)

  // Loueur
  const rx = M.left + boxW + 24
  doc.save()
  doc.roundedRect(rx, cy, boxW, boxH, 4).lineWidth(0.8).stroke(C.line)
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink)
  text(doc, 'Le Loueur', rx + 10, cy + 8)
  doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
  text(doc, company, rx + 10, cy + 20, { width: boxW - 20 })
  hline(doc, rx + 10, cy + boxH - 18, boxW - 20, C.line)
  doc.font('Helvetica').fontSize(6.5).fillColor(C.muted)
  text(doc, 'Signature & cachet', rx + 10, cy + boxH - 14)

  return cy + boxH
}

function drawFooter(doc: Doc, settings: Setting) {
  const y = PAGE_H - M.bottom
  hline(doc, M.left, y - 8, CONTENT_W, C.lineSoft)
  doc.font('Helvetica').fontSize(6.5).fillColor(C.muted)
  text(
    doc,
    `${settings.companyName} · Document généré automatiquement — à conserver`,
    M.left,
    y - 4,
    { width: CONTENT_W, align: 'center' }
  )
}

export default class RentalContractService {
  async loadRental(rentalId: number, agencyId?: number) {
    const Rental = (await import('#models/rental')).default
    const query = Rental.query().where('id', rentalId)
    if (agencyId !== undefined) {
      query.where('agencyId', agencyId)
    }
    return query
      .preload('client')
      .preload('vehicle', (vehicleQuery) => {
        vehicleQuery.preload('owner', (ownerQuery) => ownerQuery.preload('user'))
      })
      .firstOrFail()
  }

  async generate(rental: Rental) {
    const settings = await Setting.current(rental.agencyId)
    const finance = await rentalFinancials(rental)
    const vehicle = rental.vehicle
    const client = rental.client
    const ownerName = displayValue(vehicle.owner?.user?.fullName)
    const ownerPhone = displayValue(vehicle.owner?.phone)
    const paid = rental.amountPaid
    const balance = Math.max(0, finance.ttc - paid)
    const overpaid = Math.max(0, paid - finance.ttc)
    const contractRef = `PCS-LOC-${String(rental.id).padStart(5, '0')}`
    const issuedOn = DateTime.now()

    const clientRows = [
      { label: 'Nom', value: displayValue(client.fullName) },
      { label: 'Téléphone', value: displayValue(client.phone) },
      { label: 'Email', value: displayValue(client.email) },
      { label: 'Ville', value: displayValue(client.city) },
      { label: 'N° CNI', value: displayValue(client.idCardNumber) },
      { label: 'N° permis', value: displayValue(client.licenseNumber) },
      { label: 'Exp. permis', value: formatDateFr(client.licenseExpiresAt) },
    ]

    const vehicleRows = [
      { label: 'Véhicule', value: `${vehicle.brand} ${vehicle.model}` },
      { label: 'Immatriculation', value: displayValue(vehicle.plate) },
      { label: 'Année', value: vehicle.year ? String(vehicle.year) : '—' },
      { label: 'Type', value: displayValue(vehicle.vehicleType) },
      { label: 'Carburant', value: displayValue(vehicle.fuel) },
      { label: 'Kilométrage', value: `${formatNumber(vehicle.mileage)} km` },
      { label: 'Propriétaire', value: ownerName },
      { label: 'Contact', value: ownerPhone },
    ]

    const tvaPct = Math.round(finance.tvaRate * 100)
    const financeRows: Array<{ label: string; value: string; emphasize?: boolean }> = [
      { label: 'Prix / jour HT', value: formatCfa(rental.dailyPrice) },
      { label: 'Total HT', value: formatCfa(finance.grossTotal) },
      { label: `TVA (${tvaPct} %)`, value: formatCfa(finance.tva) },
      { label: 'Total TTC', value: formatCfa(finance.ttc), emphasize: true },
      { label: 'Montant réglé', value: formatCfa(paid) },
      {
        label: overpaid > 0 ? 'Trop-perçu' : 'Reste à payer',
        value: formatCfa(overpaid > 0 ? overpaid : balance),
        emphasize: true,
      },
    ]

    const clauses = [
      'Restitution du véhicule dans son état initial, hors usure normale.',
      'Le Locataire répond des infractions et amendes pendant la location.',
      'Usage réservé au Locataire déclaré, sauf accord écrit du Loueur.',
      'Toute prolongation nécessite l’accord préalable du Loueur.',
      'Sinistre, panne ou vol : informer immédiatement le Loueur.',
      'Le solde est exigible à la restitution, sauf accord contraire.',
    ]

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        autoFirstPage: true,
        info: {
          Title: `Contrat ${contractRef}`,
          Author: settings.companyName,
        },
      })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk as Buffer))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      let y = drawHeader(
        doc,
        settings,
        contractRef,
        issuedOn,
        rental.status === 'Annulée'
      )
      y = drawPartiesIntro(doc, y, settings.companyName, displayValue(client.fullName))

      const gap = 20
      const colW = (CONTENT_W - gap) / 2
      const leftBottom = drawClientBlock(doc, M.left, y, colW, clientRows)
      const rightBottom = drawVehicleBlock(doc, M.left + colW + gap, y, colW, vehicleRows)
      y = Math.max(leftBottom, rightBottom) + 14

      y = drawDuration(
        doc,
        y,
        formatDateFr(rental.startDate),
        formatDateFr(rental.endDate),
        finance.days,
        rental.status
      )
      y = drawFinance(doc, y, financeRows)
      y = drawClauses(doc, y, clauses)

      if (rental.notes?.trim()) {
        y = drawNotes(doc, y, rental.notes.trim())
      }

      drawSignatures(doc, y, issuedOn, displayValue(client.fullName), settings.companyName)
      drawFooter(doc, settings)

      doc.end()
    })
  }
}
