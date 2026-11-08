import vine from '@vinejs/vine'

export const listMarketplaceAccountsValidator = vine.create({
  status: vine.enum(['active', 'inactive'] as const).optional(),
  q: vine.string().trim().maxLength(120).optional(),
  page: vine.number().positive().optional(),
  perPage: vine.number().positive().max(50).optional(),
})

export const updateMarketplaceAccountStatusValidator = vine.create({
  status: vine.enum(['active', 'inactive'] as const),
})
