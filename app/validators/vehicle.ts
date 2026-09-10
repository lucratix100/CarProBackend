import vine from '@vinejs/vine'
import { VEHICLE_TYPES } from '#constants/vehicle_types'

const isoDate = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const vehicleStatuses = ['Disponible', 'Loué', 'Entretien', 'Hors service'] as const
const fuels = ['Essence', 'Diesel', 'Hybride', 'Électrique'] as const

export const createVehicleValidator = vine.create({
  /** null / absent = véhicule appartenant à l’agence */
  ownerId: vine.number().positive().nullable().optional(),
  marqueId: vine.number().positive(),
  modeleId: vine.number().positive(),
  brand: vine.string().trim().minLength(1).maxLength(80).optional(),
  model: vine.string().trim().minLength(1).maxLength(80).optional(),
  plate: vine.string().trim().minLength(2).maxLength(40),
  year: vine.number().min(1980).max(2100).optional(),
  color: vine.string().trim().maxLength(40).optional(),
  fuel: vine.enum(fuels),
  vehicleType: vine.enum(VEHICLE_TYPES),
  status: vine.enum(vehicleStatuses),
  mileage: vine.number().min(0).optional(),
  dailyPrice: vine.number().min(0),
  /** Prix d’achat : crée automatiquement une dépense « Achat » (voitures agence uniquement). */
  purchasePrice: vine.number().min(0).optional(),
  purchaseDate: isoDate().optional(),
  insuranceCompany: vine.string().trim().maxLength(120).optional(),
  insuranceExpiresAt: isoDate().optional(),
  technicalVisitAt: isoDate().optional(),
  photoUrl: vine.string().trim().maxLength(500).optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})

export const updateVehicleValidator = vine.create({
  ownerId: vine.number().positive().nullable().optional(),
  marqueId: vine.number().positive().optional(),
  modeleId: vine.number().positive().optional(),
  brand: vine.string().trim().minLength(1).maxLength(80).optional(),
  model: vine.string().trim().minLength(1).maxLength(80).optional(),
  plate: vine.string().trim().minLength(2).maxLength(40).optional(),
  year: vine.number().min(1980).max(2100).nullable().optional(),
  color: vine.string().trim().maxLength(40).nullable().optional(),
  fuel: vine.enum(fuels).optional(),
  vehicleType: vine.enum(VEHICLE_TYPES).optional(),
  status: vine.enum(vehicleStatuses).optional(),
  mileage: vine.number().min(0).optional(),
  dailyPrice: vine.number().min(0).optional(),
  insuranceCompany: vine.string().trim().maxLength(120).nullable().optional(),
  insuranceExpiresAt: isoDate().nullable().optional(),
  technicalVisitAt: isoDate().nullable().optional(),
  photoUrl: vine.string().trim().maxLength(500).nullable().optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
})
