import { BaseTransformer } from '@adonisjs/core/transformers'
import type Maintenance from '#models/maintenance'
import { DateTime } from 'luxon'
import { isExpenseApplied } from '#services/maintenance_expense_service'

export default class MaintenanceTransformer extends BaseTransformer<Maintenance> {
  toObject() {
    const today = DateTime.now().startOf('day')
    let alert: 'ok' | 'soon' | 'done' | 'cancelled' = 'ok'
    if (this.resource.cancelledAt) {
      alert = 'cancelled'
    } else {
      const performed = this.resource.performedOn?.startOf('day')
      // Jour J ou après la date d’intervention → Fait
      if (performed && performed <= today) {
        alert = 'done'
      } else if (this.resource.nextDueOn) {
        const due = this.resource.nextDueOn.startOf('day')
        const daysLeft = Math.floor(due.diff(today, 'days').days)
        if (daysLeft <= 0) alert = 'done'
        else if (daysLeft <= this.resource.alertDays) alert = 'soon'
      }
    }

    return {
      ...this.pick(this.resource, [
        'id',
        'vehicleId',
        'type',
        'performedOn',
        'cost',
        'mileage',
        'provider',
        'nextDueOn',
        'alertDays',
        'description',
        'cancelledAt',
        'cancelReason',
        'cancelledByUserId',
        'createdAt',
        'updatedAt',
      ]),
      isCancelled: Boolean(this.resource.cancelledAt),
      isApplied: isExpenseApplied(this.resource),
      alert,
      vehicle: this.resource.vehicle
        ? {
            id: this.resource.vehicle.id,
            brand: this.resource.vehicle.brand,
            model: this.resource.vehicle.model,
            plate: this.resource.vehicle.plate,
            label: this.resource.vehicle.label,
          }
        : null,
    }
  }
}
