import vine from '@vinejs/vine'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const rentalStatuses = ['En attente', 'Réservée', 'En cours', 'Terminée', 'Annulée'] as const

export const createRentalValidator = vine.create({
  vehicleId: vine.number().positive(),
  clientId: vine.number().positive(),
  startDate: isoDate(),
  endDate: isoDate(),
  dailyPrice: vine.number().min(0),
  amountPaid: vine.number().min(0).optional(),
  status: vine.enum(rentalStatuses),
  notes: vine.string().trim().maxLength(2000).optional(),
})

export const updateRentalValidator = vine.create({
  vehicleId: vine.number().positive().optional(),
  clientId: vine.number().positive().optional(),
  startDate: isoDate().optional(),
  endDate: isoDate().optional(),
  dailyPrice: vine.number().min(0).optional(),
  amountPaid: vine.number().min(0).optional(),
  status: vine.enum(rentalStatuses).optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  cancelReason: vine.string().trim().minLength(2).maxLength(2000).optional(),
})

export const extendRentalValidator = vine.create({
  newEndDate: isoDate(),
  dailyPrice: vine.number().min(0).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})

export const marketplaceBookingValidator = vine.create({
  vehicleId: vine.number().positive(),
  startDate: isoDate(),
  endDate: isoDate(),
  pickupTime: vine.string().regex(/^\d{2}:\d{2}$/).optional(),
  returnTime: vine.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
  phone: vine.string().trim().minLength(5).maxLength(40).optional(),
  licenseNumber: vine.string().trim().minLength(2).maxLength(80).optional(),
  licenseExpiresAt: isoDate().optional(),
  idCardNumber: vine.string().trim().minLength(2).maxLength(80).optional(),
})

export const cancelMarketplaceBookingValidator = vine.create({
  reason: vine.string().trim().maxLength(2000).optional(),
})

export const rejectRentalValidator = vine.create({
  reason: vine.string().trim().minLength(2).maxLength(2000).optional(),
})

export const cancelRentalValidator = vine.create({
  reason: vine.string().trim().minLength(2).maxLength(2000).optional(),
})
