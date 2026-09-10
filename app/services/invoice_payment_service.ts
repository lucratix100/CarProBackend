import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import Invoice from '#models/invoice'
import Payment from '#models/payment'
import Rental from '#models/rental'
import Setting from '#models/setting'
import { invoiceAmounts, todayISO } from '#services/finance_service'

export const INVOICE_STATUSES = ['Payée', 'En attente', 'En retard', 'Partiellement payée'] as const

export type CreatePaymentPayload = {
  amount: number
  paidOn: string
  method?: string | null
  reference?: string | null
  notes?: string | null
}

export function resolveInvoiceStatus(totalPaid: number, amountTtc: number, rentalStatus?: string | null) {
  if (amountTtc <= 0) return 'En attente' as const
  if (totalPaid >= amountTtc) return 'Payée' as const
  if (totalPaid > 0) return 'Partiellement payée' as const
  if (rentalStatus === 'Terminée') return 'En retard' as const
  return 'En attente' as const
}

export default class InvoicePaymentService {
  async totalPaid(invoiceId: number) {
    const payments = await Payment.query().where('invoiceId', invoiceId)
    return payments.reduce((sum, payment) => sum + payment.amount, 0)
  }

  async syncInvoice(invoice: Invoice) {
    const settings = await Setting.current(invoice.agencyId)
    const { ttc } = invoiceAmounts(invoice.amountHt, Number(settings.tvaRate))
    const totalPaid = await this.totalPaid(invoice.id)

    let rentalStatus: string | null = null
    if (invoice.rentalId) {
      const rental = await Rental.find(invoice.rentalId)
      rentalStatus = rental?.status ?? null
      if (rental && rental.amountPaid !== totalPaid) {
        rental.amountPaid = totalPaid
        await rental.save()
      }
    }

    invoice.status = resolveInvoiceStatus(totalPaid, ttc, rentalStatus)
    await invoice.save()
    return { totalPaid, balanceDue: Math.max(0, ttc - totalPaid), ttc }
  }

  async ensureInitialPayment(invoice: Invoice, amount: number, note = 'Acompte initial') {
    if (amount <= 0) return null

    const existing = await Payment.query().where('invoiceId', invoice.id).first()
    if (existing) return existing

    const payment = await Payment.create({
      invoiceId: invoice.id,
      amount,
      paidOn: DateTime.fromISO(todayISO()),
      method: 'Espèces',
      notes: note,
    })

    await this.syncInvoice(invoice)
    return payment
  }

  async listForInvoice(invoiceId: number) {
    return Payment.query().where('invoiceId', invoiceId).orderBy('paidOn', 'desc').orderBy('id', 'desc')
  }

  async create(invoiceId: number, payload: CreatePaymentPayload) {
    const invoice = await Invoice.findOrFail(invoiceId)
    const settings = await Setting.current(invoice.agencyId)
    const { ttc } = invoiceAmounts(invoice.amountHt, Number(settings.tvaRate))
    const currentPaid = await this.totalPaid(invoiceId)

    if (currentPaid + payload.amount > ttc) {
      throw new Exception(
        `Le paiement dépasse le solde restant (${Math.max(0, ttc - currentPaid).toLocaleString('fr-FR')} F CFA).`,
        { status: 422, code: 'E_PAYMENT_EXCEEDS_BALANCE' }
      )
    }

    const payment = await Payment.create({
      invoiceId,
      amount: payload.amount,
      paidOn: DateTime.fromISO(payload.paidOn),
      method: payload.method ?? null,
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
    })

    await this.syncInvoice(invoice)
    return payment
  }

  async remove(paymentId: number) {
    const payment = await Payment.findOrFail(paymentId)
    const invoice = await Invoice.findOrFail(payment.invoiceId)
    await payment.delete()
    await this.syncInvoice(invoice)
  }
}
