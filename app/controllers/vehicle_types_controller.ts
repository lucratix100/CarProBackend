import type { HttpContext } from '@adonisjs/core/http'
import { DEFAULT_VEHICLE_TYPE, VEHICLE_TYPES } from '#constants/vehicle_types'

/**
 * Catalogue des types de véhicule (enum métier, pas une table).
 */
export default class VehicleTypesController {
  async index({ response }: HttpContext) {
    return response.ok({
      data: VEHICLE_TYPES.map((name) => ({ name })),
      meta: {
        default: DEFAULT_VEHICLE_TYPE,
      },
    })
  }
}
