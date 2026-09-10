import { DateTime } from 'luxon'
import Vehicle from '#models/vehicle'
import AdminNotificationService from '#services/admin_notification_service'
import OwnerNotificationService from '#services/owner_notification_service'
import RentalService from '#services/rental_service'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'
import {
  ADMIN_NOTIFICATION_TYPES,
  COMPLIANCE_ALERT_DAYS,
  COMPLIANCE_ALERT_STAGES,
  type ComplianceAlertStage,
} from '#constants/compliance'
import { todayISO } from '#services/finance_service'

type DocKind = 'insurance' | 'technical_visit'

function daysUntil(date: DateTime | null, today: string = todayISO()): number | null {
  if (!date) return null
  const due = date.startOf('day')
  const now = DateTime.fromISO(today).startOf('day')
  return Math.floor(due.diff(now, 'days').days)
}

function stageFromDays(days: number | null): ComplianceAlertStage | null {
  if (days === null) return null
  if (days <= 0) return COMPLIANCE_ALERT_STAGES.EXPIRED
  if (days <= COMPLIANCE_ALERT_DAYS) return COMPLIANCE_ALERT_STAGES.SOON
  return null
}

export default class VehicleComplianceService {
  #admins = new AdminNotificationService()
  #owners = new OwnerNotificationService()
  #rentals = new RentalService()

  async syncAll(today: string = todayISO()) {
    const vehicles = await Vehicle.query()
    let notified = 0
    let held = 0
    let released = 0

    for (const vehicle of vehicles) {
      const result = await this.syncVehicle(vehicle, today)
      notified += result.notified
      held += result.held ? 1 : 0
      released += result.released ? 1 : 0
    }

    return { checked: vehicles.length, notified, held, released }
  }

  async syncVehicle(vehicle: Vehicle, today: string = todayISO()) {
    let notified = 0
    let held = false
    let released = false

    const insuranceResult = await this.#syncDoc(vehicle, 'insurance', today)
    notified += insuranceResult.notified
    if (insuranceResult.held) held = true

    const ctResult = await this.#syncDoc(vehicle, 'technical_visit', today)
    notified += ctResult.notified
    if (ctResult.held) held = true

    const needsHold =
      vehicle.insuranceAlertStage === COMPLIANCE_ALERT_STAGES.EXPIRED ||
      vehicle.technicalVisitAlertStage === COMPLIANCE_ALERT_STAGES.EXPIRED

    if (needsHold) {
      if (!vehicle.complianceHold || vehicle.status !== 'Hors service') {
        vehicle.complianceHold = true
        if (vehicle.status !== 'Loué') {
          vehicle.status = 'Hors service'
        }
        await vehicle.save()
        held = true
      }
    } else if (vehicle.complianceHold) {
      vehicle.complianceHold = false
      await vehicle.save()
      if (vehicle.status === 'Hors service') {
        await this.#rentals.syncVehicleStatus(vehicle.id)
      }
      released = true
    }

    return { notified, held, released }
  }

  async #syncDoc(vehicle: Vehicle, kind: DocKind, today: string) {
    const date = kind === 'insurance' ? vehicle.insuranceExpiresAt : vehicle.technicalVisitAt
    const currentStage =
      kind === 'insurance' ? vehicle.insuranceAlertStage : vehicle.technicalVisitAlertStage
    const nextStage = stageFromDays(daysUntil(date, today))
    let notified = 0
    let held = false

    if (nextStage === currentStage) {
      return { notified, held }
    }

    if (kind === 'insurance') {
      vehicle.insuranceAlertStage = nextStage
    } else {
      vehicle.technicalVisitAlertStage = nextStage
    }
    await vehicle.save()

    if (nextStage === COMPLIANCE_ALERT_STAGES.SOON) {
      await this.#notifySoon(vehicle, kind, date!)
      notified = 1
    } else if (nextStage === COMPLIANCE_ALERT_STAGES.EXPIRED) {
      await this.#notifyExpired(vehicle, kind, date!)
      notified = 1
      held = true
    }

    return { notified, held }
  }

  async #notifySoon(vehicle: Vehicle, kind: DocKind, date: DateTime) {
    const label = vehicle.label
    const iso = date.toISODate()
    const isInsurance = kind === 'insurance'
    const title = isInsurance
      ? `Assurance bientôt expirée · ${label}`
      : `Visite technique bientôt · ${label}`
    const body = isInsurance
      ? `${label} (${vehicle.plate}) : l’assurance expire le ${iso}. Renouvelez avant échéance.`
      : `${label} (${vehicle.plate}) : la visite technique expire le ${iso}. Renouvelez avant échéance.`

    await this.#admins.notifyAgencyAdmins(vehicle.agencyId, {
      type: isInsurance
        ? ADMIN_NOTIFICATION_TYPES.INSURANCE_SOON
        : ADMIN_NOTIFICATION_TYPES.TECHNICAL_VISIT_SOON,
      title,
      body,
      href: `/admin/vehicles/${vehicle.id}`,
      meta: { vehicleId: vehicle.id, kind, expiresAt: iso },
    })

    if (vehicle.ownerId) {
      await this.#owners.notify(vehicle.ownerId, {
        type: isInsurance
          ? OWNER_NOTIFICATION_TYPES.INSURANCE_SOON
          : OWNER_NOTIFICATION_TYPES.TECHNICAL_VISIT_SOON,
        title,
        body,
        href: `/portal/vehicles/${vehicle.id}`,
        meta: { vehicleId: vehicle.id, kind, expiresAt: iso },
      })
    }
  }

  async #notifyExpired(vehicle: Vehicle, kind: DocKind, date: DateTime) {
    const label = vehicle.label
    const iso = date.toISODate()
    const isInsurance = kind === 'insurance'
    const title = isInsurance
      ? `Assurance expirée · ${label}`
      : `Visite technique expirée · ${label}`
    const body = isInsurance
      ? `${label} (${vehicle.plate}) : assurance expirée depuis le ${iso}. Véhicule placé hors service jusqu’au renouvellement.`
      : `${label} (${vehicle.plate}) : visite technique expirée depuis le ${iso}. Véhicule placé hors service jusqu’au renouvellement.`

    await this.#admins.notifyAgencyAdmins(vehicle.agencyId, {
      type: isInsurance
        ? ADMIN_NOTIFICATION_TYPES.INSURANCE_EXPIRED
        : ADMIN_NOTIFICATION_TYPES.TECHNICAL_VISIT_EXPIRED,
      title,
      body,
      href: `/admin/vehicles/${vehicle.id}`,
      meta: { vehicleId: vehicle.id, kind, expiresAt: iso, complianceHold: true },
    })

    if (vehicle.ownerId) {
      await this.#owners.notify(vehicle.ownerId, {
        type: isInsurance
          ? OWNER_NOTIFICATION_TYPES.INSURANCE_EXPIRED
          : OWNER_NOTIFICATION_TYPES.TECHNICAL_VISIT_EXPIRED,
        title,
        body,
        href: `/portal/vehicles/${vehicle.id}`,
        meta: { vehicleId: vehicle.id, kind, expiresAt: iso, complianceHold: true },
      })
    }
  }
}
