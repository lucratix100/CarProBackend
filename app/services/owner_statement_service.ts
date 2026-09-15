import PDFDocument from 'pdfkit'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import Owner from '#models/owner'
import Maintenance from '#models/maintenance'
import Rental from '#models/rental'
import Vehicle from '#models/vehicle'
import Setting from '#models/setting'
import { rentalFinancials } from '#services/finance_service'
import { scopeAppliedExpenses } from '#services/maintenance_expense_service'

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
  success: '#166534',
} as const

const M = { left: 40, right: 40, top: 32, bottom: 36 }
const PAGE_W = 595.28
const PAGE_H = 841.89
const CONTENT_W = PAGE_W - M.left - M.right

type Doc = InstanceType<typeof PDFDocument>

export type OwnerStatementFilters = {
  from?: string | null
  to?: string | null
}

export type OwnerStatementLine = {
  rentalId: number
  vehicleId: number
  label: string
  plate: string
  startDate: string
  endDate: string
  status: string
  days: number
  netTotal: number
  netDailyPrice: number
}

export type OwnerStatementExpense = {
  maintenanceId: number
  vehicleId: number
  label: string
  plate: string
  type: string
  performedOn: string
  cost: number
  description: string | null
}

export type OwnerStatementVehicleRow = {
  vehicleId: number
  label: string
  plate: string
  netTotal: number
  expenses: number
  balance: number
  days: number
  rentalCount: number
  maintenanceCount: number
}

export type OwnerStatementData = {
  ownerId: number
  ownerName: string
  ownerEmail: string | null
  ownerPhone: string | null
  companyName: string
  from: string | null
  to: string | null
  issuedOn: DateTime
  totalNet: number
  totalExpenses: number
  balance: number
  lines: OwnerStatementLine[]
  expenses: OwnerStatementExpense[]
  byVehicle: OwnerStatementVehicleRow[]
}

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

function formatDateShort(value: DateTime | string | null | undefined) {
  if (!value) return '—'
  const dt = typeof value === 'string' ? DateTime.fromISO(value) : value
  if (!dt.isValid) return '—'
  return dt.setLocale('fr').toFormat('dd/MM/yyyy')
}

function isoDay(value: DateTime | string | null | undefined) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return value.toISODate() ?? ''
}

function parseOptionalDate(value: string | null | undefined, label: string) {
  if (!value) return null
  const dt = DateTime.fromISO(value)
  if (!dt.isValid) {
    throw new Exception(`Date « ${label} » invalide.`, {
      status: 422,
      code: 'E_INVALID_DATE',
    })
  }
  return dt.toISODate()
}

function rentalOverlapsRange(start: string, end: string, from: string | null, to: string | null) {
  const rangeEnd = end || start
  if (from && rangeEnd < from) return false
  if (to && start > to) return false
  return true
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
  if (y + needed <= PAGE_H - M.bottom - 12) return y
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

function drawHeader(doc: Doc, data: OwnerStatementData) {
  const y = M.top
  const h = 62

  doc.save()
  doc.rect(0, 0, PAGE_W, y + h).fill(C.brand)
  doc.restore()

  doc.save()
  doc.roundedRect(M.left, y + 12, 36, 36, 6).fill('#1a6b5f')
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white)
  text(doc, 'PCS', M.left + 7, y + 24)

  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.white)
  text(doc, data.companyName, M.left + 48, y + 14)
  doc.font('Helvetica').fontSize(8).fillColor('#c5e0db')
  text(doc, 'Mandat de gestion · Relevé de compte propriétaire', M.left + 48, y + 34)

  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white)
  text(doc, 'RELEVÉ DE COMPTE', M.left, y + 14, { width: CONTENT_W, align: 'right' })
  doc.font('Helvetica').fontSize(8).fillColor('#c5e0db')
  text(doc, `PCS-REL-${String(data.ownerId).padStart(5, '0')}`, M.left, y + 32, {
    width: CONTENT_W,
    align: 'right',
  })
  text(doc, formatDateFr(data.issuedOn), M.left, y + 44, { width: CONTENT_W, align: 'right' })

  return y + h + 16
}

function drawMeta(doc: Doc, data: OwnerStatementData, y: number) {
  let cy = sectionTitle(doc, '01 — Propriétaire & période', y)

  const periodLabel =
    data.from || data.to
      ? `Du ${formatDateFr(data.from)} au ${formatDateFr(data.to)}`
      : 'Toute la période disponible'

  const rows = [
    { label: 'Propriétaire', value: data.ownerName },
    { label: 'Email', value: data.ownerEmail || '—' },
    { label: 'Téléphone', value: data.ownerPhone || '—' },
    { label: 'Période', value: periodLabel },
  ]

  for (const row of rows) {
    cy = ensureSpace(doc, cy, 16)
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    text(doc, row.label, M.left, cy, { width: 90 })
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink)
    text(doc, row.value, M.left + 90, cy, { width: CONTENT_W - 90 })
    cy += 14
  }

  return cy + 8
}

function drawSummary(doc: Doc, data: OwnerStatementData, y: number) {
  let cy = sectionTitle(doc, '02 — Synthèse', y)
  cy = ensureSpace(doc, cy, 52)

  const boxW = (CONTENT_W - 16) / 3
  const items = [
    { label: 'Revenus nets', value: formatCfa(data.totalNet), color: C.success },
    { label: 'Dépenses', value: formatCfa(data.totalExpenses), color: C.danger },
    { label: 'Solde période', value: formatCfa(data.balance), color: C.brand },
  ]

  items.forEach((item, i) => {
    const x = M.left + i * (boxW + 8)
    doc.save()
    doc.roundedRect(x, cy, boxW, 44, 4).fill(C.brandSoft)
    doc.restore()
    doc.font('Helvetica').fontSize(7).fillColor(C.muted)
    text(doc, item.label.toUpperCase(), x + 10, cy + 10, { width: boxW - 20 })
    doc.font('Helvetica-Bold').fontSize(10).fillColor(item.color)
    text(doc, item.value, x + 10, cy + 24, { width: boxW - 20 })
  })

  return cy + 56
}

function drawTableHeader(
  doc: Doc,
  y: number,
  cols: Array<{ label: string; x: number; w: number; align?: 'left' | 'right' }>
) {
  doc.save()
  doc.rect(M.left, y - 2, CONTENT_W, 16).fill('#f1f5f9')
  doc.restore()
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.muted)
  for (const col of cols) {
    text(doc, col.label.toUpperCase(), col.x, y + 2, {
      width: col.w,
      align: col.align ?? 'left',
    })
  }
  return y + 18
}

function drawRentals(doc: Doc, data: OwnerStatementData, y: number) {
  let cy = sectionTitle(doc, '03 — Locations (crédits nets)', y)

  if (data.lines.length === 0) {
    cy = ensureSpace(doc, cy, 16)
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    text(doc, 'Aucune location sur la période.', M.left, cy)
    return cy + 18
  }

  const cols = [
    { label: 'Véhicule', x: M.left, w: 118 },
    { label: 'Période', x: M.left + 120, w: 110 },
    { label: 'Jours', x: M.left + 232, w: 36, align: 'right' as const },
    { label: 'Net / j', x: M.left + 272, w: 70, align: 'right' as const },
    { label: 'Net total', x: M.left + 348, w: CONTENT_W - 348, align: 'right' as const },
  ]

  cy = ensureSpace(doc, cy, 24)
  cy = drawTableHeader(doc, cy, cols)

  for (const line of data.lines) {
    cy = ensureSpace(doc, cy, 28)
    const vehicle = `${line.label} · ${line.plate}`
    const period = `${formatDateShort(line.startDate)} → ${formatDateShort(line.endDate)}`

    doc.font('Helvetica').fontSize(7.5).fillColor(C.ink)
    text(doc, vehicle, cols[0].x, cy, { width: cols[0].w })
    text(doc, period, cols[1].x, cy, { width: cols[1].w })
    text(doc, String(line.days), cols[2].x, cy, { width: cols[2].w, align: 'right' })
    text(doc, formatCfa(line.netDailyPrice), cols[3].x, cy, {
      width: cols[3].w,
      align: 'right',
    })
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.success)
    text(doc, `+${formatCfa(line.netTotal)}`, cols[4].x, cy, {
      width: cols[4].w,
      align: 'right',
    })
    cy += 14
    hline(doc, M.left, cy, CONTENT_W, C.lineSoft)
    cy += 6
  }

  return cy + 6
}

function drawExpenses(doc: Doc, data: OwnerStatementData, y: number) {
  let cy = sectionTitle(doc, '04 — Entretiens (débits)', y)

  if (data.expenses.length === 0) {
    cy = ensureSpace(doc, cy, 16)
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    text(doc, 'Aucune dépense d’entretien sur la période.', M.left, cy)
    return cy + 18
  }

  const cols = [
    { label: 'Véhicule', x: M.left, w: 118 },
    { label: 'Type / date', x: M.left + 120, w: 150 },
    { label: 'Détail', x: M.left + 274, w: 140 },
    { label: 'Montant', x: M.left + 418, w: CONTENT_W - 418, align: 'right' as const },
  ]

  cy = ensureSpace(doc, cy, 24)
  cy = drawTableHeader(doc, cy, cols)

  for (const row of data.expenses) {
    cy = ensureSpace(doc, cy, 28)
    const vehicle = `${row.label} · ${row.plate}`
    const typeDate = `${row.type} · ${formatDateShort(row.performedOn)}`
    const detail = (row.description || '—').slice(0, 42)

    doc.font('Helvetica').fontSize(7.5).fillColor(C.ink)
    text(doc, vehicle, cols[0].x, cy, { width: cols[0].w })
    text(doc, typeDate, cols[1].x, cy, { width: cols[1].w })
    text(doc, detail, cols[2].x, cy, { width: cols[2].w })
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.danger)
    text(doc, `−${formatCfa(row.cost)}`, cols[3].x, cy, {
      width: cols[3].w,
      align: 'right',
    })
    cy += 14
    hline(doc, M.left, cy, CONTENT_W, C.lineSoft)
    cy += 6
  }

  return cy + 6
}

function drawByVehicle(doc: Doc, data: OwnerStatementData, y: number) {
  let cy = sectionTitle(doc, '05 — Récapitulatif par véhicule', y)

  if (data.byVehicle.length === 0) {
    cy = ensureSpace(doc, cy, 16)
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    text(doc, 'Aucun véhicule rattaché.', M.left, cy)
    return cy + 18
  }

  const cols = [
    { label: 'Véhicule', x: M.left, w: 140 },
    { label: 'Loc. / entr.', x: M.left + 144, w: 70, align: 'right' as const },
    { label: 'Nets', x: M.left + 220, w: 90, align: 'right' as const },
    { label: 'Dépenses', x: M.left + 316, w: 90, align: 'right' as const },
    { label: 'Solde', x: M.left + 412, w: CONTENT_W - 412, align: 'right' as const },
  ]

  cy = ensureSpace(doc, cy, 24)
  cy = drawTableHeader(doc, cy, cols)

  for (const row of data.byVehicle) {
    cy = ensureSpace(doc, cy, 28)
    const vehicle = `${row.label} · ${row.plate}`
    doc.font('Helvetica').fontSize(7.5).fillColor(C.ink)
    text(doc, vehicle, cols[0].x, cy, { width: cols[0].w })
    text(doc, `${row.rentalCount} / ${row.maintenanceCount}`, cols[1].x, cy, {
      width: cols[1].w,
      align: 'right',
    })
    text(doc, formatCfa(row.netTotal), cols[2].x, cy, { width: cols[2].w, align: 'right' })
    text(doc, formatCfa(row.expenses), cols[3].x, cy, { width: cols[3].w, align: 'right' })
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.brand)
    text(doc, formatCfa(row.balance), cols[4].x, cy, { width: cols[4].w, align: 'right' })
    cy += 14
    hline(doc, M.left, cy, CONTENT_W, C.lineSoft)
    cy += 6
  }

  return cy + 6
}

function drawFooterNote(doc: Doc, data: OwnerStatementData, y: number) {
  let cy = ensureSpace(doc, y, 48)
  cy = sectionTitle(doc, 'Note', cy)
  doc.font('Helvetica').fontSize(7.5).fillColor(C.body)
  text(
    doc,
    'Montants nets après commission PCS. Les locataires, factures et paiements clients ne figurent pas sur ce relevé. Les dépenses listées correspondent aux entretiens appliqués au solde propriétaire.',
    M.left,
    cy,
    { width: CONTENT_W, lineGap: 1.5, align: 'justify' }
  )
  cy += 28

  const footerY = PAGE_H - M.bottom
  hline(doc, M.left, footerY - 8, CONTENT_W, C.lineSoft)
  doc.font('Helvetica').fontSize(6.5).fillColor(C.muted)
  text(
    doc,
    `${data.companyName} · Relevé propriétaire #${data.ownerId} — document généré automatiquement`,
    M.left,
    footerY - 4,
    { width: CONTENT_W, align: 'center' }
  )

  return cy
}

export default class OwnerStatementService {
  async build(ownerId: number, agencyId: number, filters: OwnerStatementFilters = {}) {
    const from = parseOptionalDate(filters.from ?? null, 'from')
    const to = parseOptionalDate(filters.to ?? null, 'to')

    if (from && to && from > to) {
      throw new Exception('La date de début doit être antérieure à la date de fin.', {
        status: 422,
        code: 'E_INVALID_RANGE',
      })
    }

    const owner = await Owner.query()
      .where('id', ownerId)
      .where('agencyId', agencyId)
      .preload('user')
      .firstOrFail()

    const settings = await Setting.current(agencyId)
    const vehicles = await Vehicle.query().where('ownerId', owner.id).orderBy('id', 'asc')
    const vehicleIds = vehicles.map((v) => v.id)

    const byVehicle = new Map<number, OwnerStatementVehicleRow>()
    for (const vehicle of vehicles) {
      byVehicle.set(vehicle.id, {
        vehicleId: vehicle.id,
        label: vehicle.label,
        plate: vehicle.plate,
        netTotal: 0,
        expenses: 0,
        balance: 0,
        days: 0,
        rentalCount: 0,
        maintenanceCount: 0,
      })
    }

    const rentals =
      vehicleIds.length === 0
        ? []
        : await Rental.query()
            .whereIn('vehicleId', vehicleIds)
            .whereNot('status', 'Annulée')
            .preload('vehicle')
            .orderBy('startDate', 'desc')

    const maintenances =
      vehicleIds.length === 0
        ? ([] as Maintenance[])
        : ((await scopeAppliedExpenses(
            Maintenance.query().whereIn('vehicleId', vehicleIds).preload('vehicle')
          ).orderBy('performedOn', 'desc')) as Maintenance[])

    let totalNet = 0
    const lines: OwnerStatementLine[] = []

    for (const rental of rentals) {
      const start = isoDay(rental.startDate)
      const end = isoDay(rental.endDate)
      if (!rentalOverlapsRange(start, end, from, to)) continue

      const finance = await rentalFinancials(rental, settings.commissionPerDay)
      totalNet += finance.netTotal
      lines.push({
        rentalId: rental.id,
        vehicleId: rental.vehicleId,
        label: rental.vehicle?.label ?? `Véhicule #${rental.vehicleId}`,
        plate: rental.vehicle?.plate ?? '—',
        startDate: start,
        endDate: end,
        status: rental.status,
        days: finance.days,
        netTotal: finance.netTotal,
        netDailyPrice: finance.netDailyPrice,
      })

      const current = byVehicle.get(rental.vehicleId)
      if (current) {
        current.netTotal += finance.netTotal
        current.days += finance.days
        current.rentalCount += 1
      }
    }

    let totalExpenses = 0
    const expenses: OwnerStatementExpense[] = []

    for (const row of maintenances) {
      const performed = isoDay(row.performedOn)
      if (from && performed < from) continue
      if (to && performed > to) continue

      const cost = Number(row.cost || 0)
      totalExpenses += cost
      expenses.push({
        maintenanceId: row.id,
        vehicleId: row.vehicleId,
        label: row.vehicle?.label ?? `Véhicule #${row.vehicleId}`,
        plate: row.vehicle?.plate ?? '—',
        type: row.type,
        performedOn: performed,
        cost,
        description: row.description,
      })

      const current = byVehicle.get(row.vehicleId)
      if (current) {
        current.expenses += cost
        current.maintenanceCount += 1
      }
    }

    for (const row of byVehicle.values()) {
      row.balance = row.netTotal - row.expenses
    }

    return {
      ownerId: owner.id,
      ownerName: owner.user?.fullName?.trim() || owner.user?.email || `Propriétaire #${owner.id}`,
      ownerEmail: owner.user?.email ?? null,
      ownerPhone: owner.phone ?? null,
      companyName: settings.companyName,
      from,
      to,
      issuedOn: DateTime.now(),
      totalNet,
      totalExpenses,
      balance: totalNet - totalExpenses,
      lines,
      expenses,
      byVehicle: [...byVehicle.values()],
    } satisfies OwnerStatementData
  }

  async generatePdf(data: OwnerStatementData) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        autoFirstPage: true,
        info: {
          Title: `Relevé propriétaire #${data.ownerId}`,
          Author: data.companyName,
        },
      })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk as Buffer))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      let y = drawHeader(doc, data)
      y = drawMeta(doc, data, y)
      y = drawSummary(doc, data, y)
      y = drawRentals(doc, data, y)
      y = drawExpenses(doc, data, y)
      y = drawByVehicle(doc, data, y)
      drawFooterNote(doc, data, y)

      doc.end()
    })
  }
}
