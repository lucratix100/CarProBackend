import vine from '@vinejs/vine'
import { MARKETPLACE_PUBLICATION_STATUSES } from '#constants/marketplace_publication'

export const rejectMarketplacePublicationValidator = vine.create({
  reason: vine.string().trim().minLength(5).maxLength(1000),
})

export const listMarketplacePublicationsValidator = vine.create({
  status: vine.enum(MARKETPLACE_PUBLICATION_STATUSES).optional(),
  agencyId: vine.number().positive().optional(),
  q: vine.string().trim().maxLength(120).optional(),
  page: vine.number().positive().optional(),
  perPage: vine.number().positive().max(50).optional(),
})

export const bulkApproveMarketplacePublicationsValidator = vine.create({
  ids: vine.array(vine.number().positive()).minLength(1).maxLength(50),
})

export const listMarketplaceReportsValidator = vine.create({
  vehicleId: vine.number().positive().optional(),
  agencyId: vine.number().positive().optional(),
  status: vine.enum(['open', 'resolved', 'dismissed'] as const).optional(),
  page: vine.number().positive().optional(),
  perPage: vine.number().positive().max(50).optional(),
})
