import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import Vehicle from '#models/vehicle'
import VehicleExpense from '#models/vehicle_expense'
import VehicleExpenseTransformer from '#transformers/vehicle_expense_transformer'
import {
  createVehicleExpenseValidator,
  updateVehicleExpenseValidator,
} from '#validators/vehicle_expense'

export default class VehicleExpensesController {
  async #findVehicle(id: number | string, agencyId: number) {
    return Vehicle.query().where('id', id).where('agencyId', agencyId).firstOrFail()
  }

  async #findExpense(id: number | string, agencyId: number) {
    return VehicleExpense.query().where('id', id).where('agencyId', agencyId).firstOrFail()
  }

  #assertAchatAllowed(vehicle: Vehicle, type: string) {
    if (type === 'Achat' && vehicle.ownerId !== null) {
      throw new Exception(
        'Le prix d’achat (amortissement) ne concerne que les véhicules appartenant à l’agence.',
        { status: 422, code: 'E_ACHAT_AGENCY_ONLY' }
      )
    }
  }

  async index({ request, serialize, agencyId }: HttpContext) {
    const vehicleId = request.input('vehicleId')
    const type = request.input('type')
    const includeCancelled =
      request.input('includeCancelled') === 'true' || request.input('includeCancelled') === true

    const query = VehicleExpense.query().where('agencyId', agencyId!)
    if (vehicleId) query.where('vehicleId', vehicleId)
    if (type) query.where('type', type)
    if (!includeCancelled) query.whereNull('cancelledAt')

    const rows = await query.orderBy('spentOn', 'desc').orderBy('id', 'desc')
    return serialize(VehicleExpenseTransformer.transform(rows))
  }

  async store({ request, response, serialize, auth, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createVehicleExpenseValidator)
    const vehicle = await this.#findVehicle(payload.vehicleId, agencyId!)
    this.#assertAchatAllowed(vehicle, payload.type)

    const user = auth.use('api').getUserOrFail()
    const row = await VehicleExpense.create({
      agencyId: agencyId!,
      vehicleId: vehicle.id,
      type: payload.type,
      amount: payload.amount,
      spentOn: DateTime.fromISO(payload.spentOn),
      provider: payload.provider ?? null,
      notes: payload.notes ?? null,
      cancelledAt: null,
      cancelReason: null,
      createdByUserId: user.id,
    })

    return response.created(await serialize(VehicleExpenseTransformer.transform(row)))
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const row = await this.#findExpense(params.id, agencyId!)
    return serialize(VehicleExpenseTransformer.transform(row))
  }

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const row = await this.#findExpense(params.id, agencyId!)
    if (row.cancelledAt) {
      throw new Exception('Cette dépense est annulée et ne peut plus être modifiée.', {
        status: 422,
        code: 'E_EXPENSE_CANCELLED',
      })
    }

    const payload = await request.validateUsing(updateVehicleExpenseValidator)
    const vehicle = await this.#findVehicle(row.vehicleId, agencyId!)

    if (payload.cancel === true) {
      row.cancelledAt = DateTime.now()
      row.cancelReason = payload.cancelReason ?? 'Annulée'
      await row.save()
      return serialize(VehicleExpenseTransformer.transform(row))
    }

    const nextType = payload.type ?? row.type
    this.#assertAchatAllowed(vehicle, nextType)

    row.merge({
      type: nextType,
      amount: payload.amount ?? row.amount,
      spentOn: payload.spentOn ? DateTime.fromISO(payload.spentOn) : row.spentOn,
      provider: payload.provider === undefined ? row.provider : payload.provider,
      notes: payload.notes === undefined ? row.notes : payload.notes,
    })
    await row.save()
    return serialize(VehicleExpenseTransformer.transform(row))
  }

  async destroy({ params, response, agencyId }: HttpContext) {
    const row = await this.#findExpense(params.id, agencyId!)
    if (!row.cancelledAt) {
      row.cancelledAt = DateTime.now()
      row.cancelReason = 'Supprimée'
      await row.save()
    }
    return response.ok({ message: 'Dépense annulée.' })
  }
}
