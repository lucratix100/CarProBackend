import type VehicleExpense from '#models/vehicle_expense'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class VehicleExpenseTransformer extends BaseTransformer<VehicleExpense> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'agencyId',
        'vehicleId',
        'type',
        'amount',
        'spentOn',
        'provider',
        'notes',
        'cancelledAt',
        'cancelReason',
        'createdByUserId',
        'createdAt',
        'updatedAt',
      ]),
      isCancelled: Boolean(this.resource.cancelledAt),
    }
  }
}
