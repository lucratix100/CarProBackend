import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import type Vehicle from '#models/vehicle'

export function parseBoostDate(value: string | null | undefined) {
  if (!value) return null
  const dt = DateTime.fromISO(value)
  return dt.isValid ? dt : null
}

export function assertBoostDateWindow(startsAt: DateTime | null, endsAt: DateTime | null) {
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new Exception('La date de fin doit être postérieure à la date de début.', {
      status: 422,
      code: 'E_BOOST_DATE_WINDOW',
    })
  }
}

/** Fenêtre terminée : le jour de fin est passé. Sans date de fin, le boost reste ouvert. */
export function boostWindowEnded(vehicle: Vehicle, now = DateTime.now()) {
  if (!vehicle.boostEndsAt) return false
  return now > vehicle.boostEndsAt.endOf('day')
}

export function resetVehicleBoost(vehicle: Vehicle) {
  vehicle.boostStatus = 'none'
  vehicle.boostStartsAt = null
  vehicle.boostEndsAt = null
  vehicle.boostSubmittedAt = null
  vehicle.boostReviewedAt = null
  vehicle.boostReviewedByUserId = null
  vehicle.boostRejectionReason = null
}

export function boostDatePayload(vehicle: Vehicle) {
  return {
    boostStatus: vehicle.boostStatus || 'none',
    boostStartsAt: vehicle.boostStartsAt?.toISODate?.() ?? null,
    boostEndsAt: vehicle.boostEndsAt?.toISODate?.() ?? null,
    boostSubmittedAt: vehicle.boostSubmittedAt?.toISO?.() ?? null,
    boostReviewedAt: vehicle.boostReviewedAt?.toISO?.() ?? null,
    boostRejectionReason: vehicle.boostRejectionReason,
    boostIsLive: vehicle.isBoostLive(),
  }
}
