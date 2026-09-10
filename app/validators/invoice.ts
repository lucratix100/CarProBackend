import vine from '@vinejs/vine'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const invoiceStatuses = ['Payée', 'En attente', 'En retard', 'Partiellement payée'] as const

export const createInvoiceValidator = vine.create({
  clientId: vine.number().positive(),
  rentalId: vine.number().positive().optional(),
  amountHt: vine.number().min(0),
  issuedOn: isoDate(),
  description: vine.string().trim().maxLength(2000).optional(),
})

export const updateInvoiceValidator = vine.create({
  clientId: vine.number().positive().optional(),
  rentalId: vine.number().positive().nullable().optional(),
  amountHt: vine.number().min(0).optional(),
  issuedOn: isoDate().optional(),
  description: vine.string().trim().maxLength(2000).nullable().optional(),
})

export { invoiceStatuses }
