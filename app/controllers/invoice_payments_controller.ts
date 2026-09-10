import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import Payment from '#models/payment'
import InvoicePaymentService from '#services/invoice_payment_service'
import PaymentTransformer from '#transformers/payment_transformer'
import { createPaymentValidator } from '#validators/payment'

export default class InvoicePaymentsController {
  #service = new InvoicePaymentService()

  async #findInvoice(invoiceId: number | string, agencyId: number) {
    return Invoice.query().where('id', invoiceId).where('agencyId', agencyId).firstOrFail()
  }

  async index({ params, serialize, agencyId }: HttpContext) {
    await this.#findInvoice(params.invoiceId, agencyId!)
    const payments = await this.#service.listForInvoice(Number(params.invoiceId))
    return serialize(PaymentTransformer.transform(payments))
  }

  async store({ params, request, response, serialize, agencyId }: HttpContext) {
    await this.#findInvoice(params.invoiceId, agencyId!)
    const payload = await request.validateUsing(createPaymentValidator)
    const payment = await this.#service.create(Number(params.invoiceId), {
      amount: payload.amount,
      paidOn: payload.paidOn,
      method: payload.method ?? null,
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
    })
    return response.created(await serialize(PaymentTransformer.transform(payment)))
  }

  async destroy({ params, response, agencyId }: HttpContext) {
    await this.#findInvoice(params.invoiceId, agencyId!)
    await Payment.query()
      .where('id', params.paymentId)
      .where('invoiceId', params.invoiceId)
      .firstOrFail()
    await this.#service.remove(Number(params.paymentId))
    return response.ok({ message: 'Paiement supprimé.' })
  }
}
