import vine from '@vinejs/vine'

export const marketplaceSyncValidator = vine.create({
  email: vine.string().email().maxLength(254).toLowerCase(),
  fullName: vine.string().trim().minLength(1).maxLength(160).optional(),
  phone: vine.string().trim().minLength(5).maxLength(40).optional(),
  betterAuthUserId: vine.string().trim().maxLength(120).optional(),
  googleId: vine.string().trim().maxLength(120).optional(),
})

export const marketplaceCatalogValidator = vine.create({
  cityId: vine.number().positive().optional(),
  startDate: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fuel: vine.string().trim().maxLength(40).optional(),
  minPrice: vine.number().min(0).optional(),
  maxPrice: vine.number().min(0).optional(),
  q: vine.string().trim().maxLength(120).optional(),
  page: vine.number().positive().optional(),
  perPage: vine.number().positive().optional(),
})

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const marketplaceProfileValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(160).optional(),
  phone: vine.string().trim().minLength(5).maxLength(40).optional(),
  licenseNumber: vine.string().trim().minLength(2).maxLength(80).nullable().optional(),
  licenseExpiresAt: isoDate().nullable().optional(),
  idCardNumber: vine.string().trim().minLength(2).maxLength(80).nullable().optional(),
})

const score = () => vine.number().withoutDecimals().min(1).max(5)

export const marketplaceReviewValidator = vine.create({
  cleanliness: score(),
  punctuality: score(),
  vehicleCondition: score(),
  communication: score(),
  comment: vine.string().trim().maxLength(2000).optional(),
})

export const marketplaceFavoriteValidator = vine.create({
  vehicleId: vine.number().positive(),
  notifyAvailable: vine.boolean().optional(),
})

export const marketplaceFavoriteNotifyValidator = vine.create({
  notifyAvailable: vine.boolean(),
})

export const MARKETPLACE_REPORT_REASONS = [
  'misleading',
  'unavailable',
  'pricing',
  'safety',
  'other',
] as const

export const marketplaceReportValidator = vine.create({
  vehicleId: vine.number().positive(),
  rentalId: vine.number().positive().optional(),
  reason: vine.enum(MARKETPLACE_REPORT_REASONS),
  message: vine.string().trim().minLength(10).maxLength(2000).optional(),
  contactEmail: vine.string().email().maxLength(254).toLowerCase().optional(),
})
