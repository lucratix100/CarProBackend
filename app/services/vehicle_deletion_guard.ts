import { Exception } from '@adonisjs/core/exceptions'
import Maintenance from '#models/maintenance'
import Rental from '#models/rental'
import VehicleExpense from '#models/vehicle_expense'

async function countRows(
  count: () => Promise<Array<{ $extras: { total?: string | number } }>>
) {
  const rows = await count()
  return Number(rows[0]?.$extras?.total ?? 0)
}

/**
 * Un véhicule qui a déjà un historique financier reste en base.
 * Le retrait se fait par le statut « Hors service ».
 */
export async function assertVehicleDeletable(vehicleId: number) {
  const [rentals, expenses, maintenances] = await Promise.all([
    countRows(() => Rental.query().where('vehicleId', vehicleId).count('* as total')),
    countRows(() => VehicleExpense.query().where('vehicleId', vehicleId).count('* as total')),
    countRows(() => Maintenance.query().where('vehicleId', vehicleId).count('* as total')),
  ])

  if (rentals + expenses + maintenances > 0) {
    throw new Exception(
      'Ce véhicule a des locations, des dépenses ou des entretiens. Passez-le en Hors service.',
      { status: 422, code: 'E_VEHICLE_HAS_HISTORY' }
    )
  }
}
