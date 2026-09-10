import { BaseTransformer } from '@adonisjs/core/transformers'
import { DateTime } from 'luxon'
import type Rental from '#models/rental'

function isFilled(value: string | null | undefined) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 && normalized !== 'à compléter' && normalized !== 'a completer'
}

function clientIsVerified(client: NonNullable<Rental['client']>) {
  const expiresAt = client.licenseExpiresAt?.toISODate?.() ?? null
  const today = DateTime.now().toISODate()!
  const licenseExpired = Boolean(expiresAt && expiresAt < today)
  return (
    isFilled(client.fullName) &&
    isFilled(client.phone) &&
    isFilled(client.licenseNumber) &&
    isFilled(client.idCardNumber) &&
    Boolean(expiresAt) &&
    !licenseExpired &&
    client.isActive !== false
  )
}

export default class RentalTransformer extends BaseTransformer<Rental> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'vehicleId',
        'clientId',
        'startDate',
        'endDate',
        'dailyPrice',
        'amountPaid',
        'status',
        'notes',
        'source',
        'cancelReason',
        'cancelledAt',
        'cancelledBy',
        'createdAt',
        'updatedAt',
      ]),
      vehicle: this.resource.vehicle
        ? {
            id: this.resource.vehicle.id,
            brand: this.resource.vehicle.brand,
            model: this.resource.vehicle.model,
            plate: this.resource.vehicle.plate,
            label: this.resource.vehicle.label,
            ownerId: this.resource.vehicle.ownerId,
          }
        : null,
      client: this.resource.client
        ? {
            id: this.resource.client.id,
            fullName: this.resource.client.fullName,
            phone: this.resource.client.phone,
            isVerified: clientIsVerified(this.resource.client),
          }
        : null,
    }
  }

  /** Owner portal: no client PII, gross price left for controller to replace with net. */
  ownerView() {
    return {
      ...this.pick(this.resource, [
        'id',
        'vehicleId',
        'startDate',
        'endDate',
        'status',
        'createdAt',
        'updatedAt',
      ]),
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
