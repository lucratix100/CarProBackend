export const OFFER_TYPES = ['rent', 'sale', 'both'] as const

export type OfferType = (typeof OFFER_TYPES)[number]

export function includesRent(offerType: string | null | undefined) {
  return offerType === 'rent' || offerType === 'both' || !offerType
}

export function includesSale(offerType: string | null | undefined) {
  return offerType === 'sale' || offerType === 'both'
}

export const VEHICLE_STATUSES = [
  'Disponible',
  'Loué',
  'Entretien',
  'Hors service',
  'À vendre',
  'Vendu',
] as const

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export const SALE_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'cancelled',
  'sold',
] as const

export type SaleStatus = (typeof SALE_STATUSES)[number]
