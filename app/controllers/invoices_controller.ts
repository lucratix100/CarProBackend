import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import Client from '#models/client'
import Rental from '#models/rental'
import Payment from '#models/payment'
import Setting from '#models/setting'
import { invoiceAmounts } from '#services/finance_service'
import InvoicePaymentService from '#services/invoice_payment_service'
import InvoicePdfService from '#services/invoice_pdf_service'
import InvoiceTransformer from '#transformers/invoice_transformer'
import PaymentTransformer from '#transformers/payment_transformer'
import { createInvoiceValidator, updateInvoiceValidator } from '#validators/invoice'
import { isPaginatedRequest, paginationMeta, readPage } from '#services/pagination'

function unwrapSerialized<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

type InvoiceSearch = {
  status?: string
  clientId?: string | number
  from?: string
  to?: string
  client?: string
  plate?: string
}

function parseIsoDate(value: unknown) {
  const text = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

function likeTerm(value: string) {
  return `%${value.replace(/[%_\\]/g, '\\$&')}%`
}

function applyInvoiceSearch(query: ReturnType<typeof Invoice.query>, search: InvoiceSearch) {
  if (search.status) query.where('status', search.status)
  if (search.clientId) query.where('clientId', search.clientId)
  if (search.from) query.where('issuedOn', '>=', search.from)
  if (search.to) query.where('issuedOn', '<=', search.to)

  const client = search.client?.trim()
  if (client) {
    const term = likeTerm(client)
    query.whereHas('client', (clientQuery) => {
      clientQuery.where((builder) => {
        builder.whereILike('fullName', term).orWhereILike('phone', term)
      })
    })
  }

  const plate = search.plate?.trim()
  if (plate) {
    const term = likeTerm(plate)
    const compact = plate.replace(/[\s-]/g, '').toUpperCase()
    query.whereHas('rental', (rentalQuery) => {
      rentalQuery.whereHas('vehicle', (vehicleQuery) => {
        vehicleQuery.where((builder) => {
          builder.whereILike('plate', term)
          if (compact) {
            builder.orWhereRaw(
              `replace(replace(upper(plate), ' ', ''), '-', '') like ?`,
              [likeTerm(compact)]
            )
          }
        })
      })
    })
  }
}

export default class InvoicesController {
  #payments = new InvoicePaymentService()
  #pdf = new InvoicePdfService()

  async #findScoped(id: number | string, agencyId: number) {
    return Invoice.query().where('id', id).where('agencyId', agencyId).firstOrFail()
  }

  async #assertClientInAgency(clientId: number, agencyId: number) {
    const client = await Client.query().where('id', clientId).where('agencyId', agencyId).first()
    if (!client) {
      throw new Exception('Client introuvable pour cette agence.', {
        status: 422,
        code: 'E_CLIENT_AGENCY',
      })
    }
    return client
  }

  async #assertRentalInAgency(rentalId: number, agencyId: number) {
    const rental = await Rental.query().where('id', rentalId).where('agencyId', agencyId).first()
    if (!rental) {
      throw new Exception('Location introuvable pour cette agence.', {
        status: 422,
        code: 'E_RENTAL_AGENCY',
      })
    }
    return rental
  }

  async #withAmounts(invoice: Invoice, serialize: HttpContext['serialize']) {
    await this.#payments.syncInvoice(invoice)
    await invoice.refresh()
    const settings = await Setting.current(invoice.agencyId)
    const serialized = await serialize(InvoiceTransformer.transform(invoice))
    const base = (serialized as { data?: Record<string, unknown> }).data ?? serialized
    const amounts = invoiceAmounts(invoice.amountHt, Number(settings.tvaRate))
    const payments = await this.#payments.listForInvoice(invoice.id)
    const amountPaid = payments.reduce(
      (sum, payment) => (payment.cancelledAt ? sum : sum + payment.amount),
      0
    )

    return {
      ...base,
      ...amounts,
      amountPaid,
      balanceDue: Math.max(0, amounts.ttc - amountPaid),
      payments: unwrapSerialized(await serialize(PaymentTransformer.transform(payments))),
    }
  }

  async index({ request, serialize, agencyId }: HttpContext) {
    const search: InvoiceSearch = {
      status: String(request.input('status', '')).trim() || undefined,
      clientId: request.input('clientId') || undefined,
      from: parseIsoDate(request.input('from')) || undefined,
      to: parseIsoDate(request.input('to')) || undefined,
      client: String(request.input('client', '')).trim().slice(0, 80) || undefined,
      plate: String(request.input('plate', '')).trim().slice(0, 40) || undefined,
    }
    const query = Invoice.query().where('agencyId', agencyId!).preload('client')
    applyInvoiceSearch(query, search)

    if (!isPaginatedRequest(request)) {
      const invoices = await query.orderBy('issuedOn', 'desc')
      return Promise.all(invoices.map((invoice) => this.#withAmounts(invoice, serialize)))
    }

    const { page, perPage } = readPage(request)
    const paginator = await query.orderBy('issuedOn', 'desc').paginate(page, perPage)
    const data = await Promise.all(
      paginator.all().map((invoice) => this.#withAmounts(invoice, serialize))
    )
    const { status: _status, ...summarySearch } = search
    return {
      data,
      meta: paginationMeta(paginator, page, perPage),
      summary: await this.#summary(agencyId!, summarySearch),
    }
  }

  async #summary(agencyId: number, search: Omit<InvoiceSearch, 'status'> = {}) {
    const count = async (status?: string) => {
      const query = Invoice.query().where('agencyId', agencyId)
      applyInvoiceSearch(query, { ...search, status })
      const rows = await query.count('* as total')
      return Number(rows[0]?.$extras?.total ?? 0)
    }

    const [total, paid, partial, pending, overdue] = await Promise.all([
      count(),
      count('Payée'),
      count('Partiellement payée'),
      count('En attente'),
      count('En retard'),
    ])

    return { total, paid, partial, pending, overdue }
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createInvoiceValidator)
    await this.#assertClientInAgency(payload.clientId, agencyId!)
    if (payload.rentalId) await this.#assertRentalInAgency(payload.rentalId, agencyId!)

    const invoice = await Invoice.create({
      agencyId: agencyId!,
      clientId: payload.clientId,
      rentalId: payload.rentalId ?? null,
      amountHt: payload.amountHt,
      issuedOn: DateTime.fromISO(payload.issuedOn),
      status: 'En attente',
      description: payload.description ?? null,
    })
    await invoice.load('client')
    return response.created(await this.#withAmounts(invoice, serialize))
  }

  async pdf({ params, response, agencyId }: HttpContext) {
    const invoice = await Invoice.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .preload('client')
      .preload('payments', (query) => query.orderBy('paidOn', 'asc').orderBy('id', 'asc'))
      .preload('rental', (query) => query.preload('vehicle'))
      .firstOrFail()

    await this.#payments.syncInvoice(invoice)
    const pdf = await this.#pdf.generate(invoice)
    const filename = `facture-${invoice.id}.pdf`

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `inline; filename="${filename}"`)
    return response.send(pdf)
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const invoice = await Invoice.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .preload('client')
      .firstOrFail()
    return this.#withAmounts(invoice, serialize)
  }

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const invoice = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(updateInvoiceValidator)
    const paymentCount = await Payment.query()
      .where('invoiceId', invoice.id)
      .whereNull('cancelledAt')
      .count('* as total')
    const hasPayments = Number(paymentCount[0].$extras.total) > 0

    if (invoice.rentalId) {
      if (payload.clientId !== undefined || payload.rentalId !== undefined || payload.amountHt !== undefined) {
        throw new Exception('Cette facture est liée à une location : seules la date et la description sont modifiables.', {
          status: 422,
          code: 'E_INVOICE_LINKED',
        })
      }
    } else if (hasPayments && payload.amountHt !== undefined && payload.amountHt !== invoice.amountHt) {
      throw new Exception('Impossible de modifier le montant : des paiements ont déjà été enregistrés.', {
        status: 422,
        code: 'E_INVOICE_HAS_PAYMENTS',
      })
    }

    if (payload.clientId) await this.#assertClientInAgency(payload.clientId, agencyId!)
    if (payload.rentalId) await this.#assertRentalInAgency(payload.rentalId, agencyId!)

    invoice.merge({
      clientId: payload.clientId ?? invoice.clientId,
      rentalId: payload.rentalId === undefined ? invoice.rentalId : payload.rentalId,
      amountHt: payload.amountHt ?? invoice.amountHt,
      description: payload.description === undefined ? invoice.description : payload.description,
    })

    if (payload.issuedOn) {
      invoice.issuedOn = DateTime.fromISO(payload.issuedOn)
    }

    await invoice.save()
    await this.#payments.syncInvoice(invoice)
    await invoice.load('client')
    return this.#withAmounts(invoice, serialize)
  }

  async destroy({ params, response, agencyId }: HttpContext) {
    const invoice = await this.#findScoped(params.id, agencyId!)
    if (invoice.rentalId) {
      throw new Exception('Impossible de supprimer une facture liée à une location.', {
        status: 422,
        code: 'E_INVOICE_LINKED',
      })
    }
    await invoice.delete()
    return response.ok({ message: 'Facture supprimée.' })
  }
}
