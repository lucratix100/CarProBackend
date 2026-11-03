import vine from '@vinejs/vine'
import { SALE_STATUSES } from '#constants/offer_types'

export const createVehicleSaleValidator = vine.create({
  vehicleId: vine.number().positive(),
  clientId: vine.number().positive(),
  offeredPrice: vine.number().min(0),
  notes: vine.string().trim().maxLength(2000).optional(),
})

export const marketplaceSaleOfferValidator = vine.create({
  vehicleId: vine.number().positive(),
  offeredPrice: vine.number().min(1),
  notes: vine.string().trim().maxLength(2000).optional(),
  phone: vine.string().trim().minLength(6).maxLength(40).optional(),
})

export const rejectVehicleSaleValidator = vine.create({
  reason: vine.string().trim().minLength(2).maxLength(1000),
})

export const markSoldVehicleSaleValidator = vine.create({
  /** Prix après négociation. Absent : reprend le prix de l’offre. */
  finalPrice: vine.number().min(1),
  /** Part gardée par l’agence si le véhicule est en mandat. */
  agencyCommission: vine.number().min(0).optional(),
  /** Commission versée à un intermédiaire, enregistrée en dépense. */
  paidCommission: vine.number().min(0).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})

export const listVehicleSalesValidator = vine.create({
  status: vine.enum(SALE_STATUSES).optional(),
  vehicleId: vine.number().positive().optional(),
  clientId: vine.number().positive().optional(),
  page: vine.number().min(1).optional(),
  perPage: vine.number().min(1).max(100).optional(),
})
