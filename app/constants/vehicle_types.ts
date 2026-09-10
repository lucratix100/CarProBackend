/**
 * Types de carrosserie / catégorie de véhicule.
 * Source de vérité (enum métier) — pas de table SQL.
 * Exposé via GET /api/v1/vehicle-types
 */
export const VEHICLE_TYPES = [
  'Berline',
  'Citadine',
  'SUV',
  '4x4',
  'Break',
  'Monospace',
  'Coupé',
  'Cabriolet',
  'Pick-up',
  'Camionnette',
  'Camion',
  'Minibus',
  'Utilitaire',
  'Autre',
] as const

export type VehicleType = (typeof VEHICLE_TYPES)[number]

export const DEFAULT_VEHICLE_TYPE: VehicleType = 'Berline'

export function isVehicleType(value: string): value is VehicleType {
  return (VEHICLE_TYPES as readonly string[]).includes(value)
}
