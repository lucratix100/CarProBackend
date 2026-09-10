/**
 * Types de carrosserie / catégorie de véhicule (enum métier).
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
