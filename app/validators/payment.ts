import vine from '@vinejs/vine'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const paymentMethods = ['Espèces', 'Virement', 'Mobile money', 'Chèque', 'Autre'] as const

export const createPaymentValidator = vine.create({
  amount: vine.number().positive(),
  paidOn: isoDate(),
  method: vine.enum(paymentMethods).optional(),
  reference: vine.string().trim().maxLength(120).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
