import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import Payment from '#models/payment'
import InvoicePaymentService from '#services/invoice_payment_service'
import PaymentTransformer from '#transformers/payment_transformer'
import { createPaymentValidator } from '#validators/payment'
import AuditService from '#services/audit_service'
import ValidationService, { pendingValidationResponse } from '#services/validation_service'

export default class InvoicePaymentsController {
  #service = new InvoicePaymentService()
  #audit = new AuditService()
  #validation = new ValidationService()

  async #findInvoice(invoiceId: number | string, agencyId: number) {
    return Invoice.query().where('id', invoiceId).where('agencyId', agencyId).firstOrFail()
  }

  async index({ params, serialize, agencyId }: HttpContext) {
    await this.#findInvoice(params.invoiceId, agencyId!)
    const payments = await this.#service.listForInvoice(Number(params.invoiceId))
    return serialize(PaymentTransformer.transform(payments))
  }

  async store({ params, request, response, serialize, agencyId, auth }: HttpContext) {
    const invoice = await this.#findInvoice(params.invoiceId, agencyId!)
    const payload = await request.validateUsing(createPaymentValidator)
    const user = auth.use('api').getUserOrFail()
    const payment = await this.#service.create(Number(params.invoiceId), {
      amount: payload.amount,
      paidOn: payload.paidOn,
      method: payload.method ?? null,
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
    })

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'payment.create',
      module: 'payments',
      entityType: 'payment',
      entityId: payment.id,
      rentalId: invoice.rentalId,
      clientId: invoice.clientId,
      newValues: {
        amount: payload.amount,
        method: payload.method ?? null,
        paidOn: payload.paidOn,
        invoiceId: invoice.id,
      },
      summary: `Paiement de ${payload.amount} FCFA sur facture #${invoice.id}`,
      ip: request.ip(),
    })

    return response.created(await serialize(PaymentTransformer.transform(payment)))
  }

  async destroy({ params, response, agencyId, auth, request }: HttpContext) {
    const invoice = await this.#findInvoice(params.invoiceId, agencyId!)
    const payment = await Payment.query()
      .where('id', params.paymentId)
      .where('invoiceId', params.invoiceId)
      .firstOrFail()
    const user = auth.use('api').getUserOrFail()
    const snapshot = {
      amount: payment.amount,
      method: payment.method,
      invoiceId: invoice.id,
    }
    const paymentId = payment.id

    const gate = await this.#validation.gate({
      agencyId: agencyId!,
      actor: user,
      actionCode: 'payments.cancel',
      module: 'payments',
      entityType: 'payment',
      entityId: paymentId,
      rentalId: invoice.rentalId,
      clientId: invoice.clientId,
      oldValues: snapshot,
      newValues: null,
      payload: { paymentId, invoiceId: invoice.id },
      summary: `Annulation paiement #${paymentId} (facture #${invoice.id})`,
      ip: request.ip(),
    })
    if (gate.outcome === 'pending') {
      return pendingValidationResponse(gate.request)
    }

    await this.#service.remove(Number(params.paymentId))

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'payment.cancel',
      module: 'payments',
      entityType: 'payment',
      entityId: paymentId,
      rentalId: invoice.rentalId,
      clientId: invoice.clientId,
      oldValues: snapshot,
      summary: `Annulation paiement #${paymentId} (facture #${invoice.id})`,
      ip: request.ip(),
    })

    if (gate.mode === 'notify') {
      await this.#validation.notifyAfterProceed({
        agencyId: agencyId!,
        actor: user,
        actionCode: 'payments.cancel',
        module: 'payments',
        summary: `Annulation paiement #${paymentId}`,
        entityType: 'payment',
        entityId: paymentId,
      })
    }

    return response.ok({ message: 'Paiement supprimé.' })
  }
}
