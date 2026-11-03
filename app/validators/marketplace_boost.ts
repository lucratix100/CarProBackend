import vine from '@vinejs/vine'
import { MARKETPLACE_BOOST_STATUSES } from '#constants/marketplace_boost'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const requestMarketplaceBoostValidator = vine.create({
  startsAt: isoDate().nullable().optional(),
  endsAt: isoDate().nullable().optional(),
})

export const rejectMarketplaceBoostValidator = vine.create({
  reason: vine.string().trim().minLength(5).maxLength(1000),
})

export const listMarketplaceBoostsValidator = vine.create({
  status: vine.enum(MARKETPLACE_BOOST_STATUSES).optional(),
  q: vine.string().trim().maxLength(120).optional(),
  page: vine.number().positive().optional(),
  perPage: vine.number().positive().max(50).optional(),
})
