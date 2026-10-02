import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'
import Agency from '#models/agency'
import User from '#models/user'
import Vehicle from '#models/vehicle'

/** Comptes qui occupent une place. Révoqué libère la place. */
const STAFF_SEAT_STATUSES = ['invited', 'active', 'suspended', 'blocked'] as const

export default class AgencyPlanService {
  async countVehicles(agencyId: number) {
    const rows = await Vehicle.query().where('agencyId', agencyId).count('* as total')
    return Number(rows[0]?.$extras?.total ?? 0)
  }

  async countStaffSeats(agencyId: number) {
    const rows = await User.query()
      .where('agencyId', agencyId)
      .where('role', 'staff')
      .whereIn('status', [...STAFF_SEAT_STATUSES])
      .count('* as total')
    return Number(rows[0]?.$extras?.total ?? 0)
  }

  async assertCanCreateVehicle(agencyId: number) {
    const agency = await Agency.findOrFail(agencyId)
    if (agency.vehicleLimit == null) return
    const count = await this.countVehicles(agencyId)
    if (count >= agency.vehicleLimit) {
      throw new Exception(
        `Plafond de véhicules atteint (${count} / ${agency.vehicleLimit}).`,
        { status: 422, code: 'E_VEHICLE_LIMIT' }
      )
    }
  }

  async assertCanInviteStaff(agency: Agency) {
    if (agency.staffPaused) {
      throw new Exception('L’équipe est en pause. Les invitations sont fermées.', {
        status: 422,
        code: 'E_STAFF_PAUSED',
      })
    }
    if (agency.staffLimit == null) return
    const count = await this.countStaffSeats(agency.id)
    if (count >= agency.staffLimit) {
      throw new Exception(
        `Plafond de collaborateurs atteint (${count} / ${agency.staffLimit}).`,
        { status: 422, code: 'E_STAFF_LIMIT' }
      )
    }
  }

  assertStaffCanAuthenticate(agency: Agency | null | undefined) {
    if (!agency?.staffPaused) return
    throw new Exception(
      'L’accès des collaborateurs est en pause. Contactez le gérant de votre agence.',
      { status: 403, code: 'E_STAFF_PAUSED' }
    )
  }

  /**
   * Pendant la pause, un lien d’invitation ne doit pas expirer.
   * À la reprise, il reste valable au moins 7 jours.
   */
  async extendInvitedExpirations(agencyId: number) {
    const invited = await User.query()
      .where('agencyId', agencyId)
      .where('role', 'staff')
      .where('status', 'invited')

    const floor = DateTime.now().plus({ days: 7 })
    for (const user of invited) {
      if (!user.invitationExpiresAt || user.invitationExpiresAt < floor) {
        user.invitationExpiresAt = floor
        await user.save()
      }
    }
  }

  async revokeStaffSessions(agencyId: number) {
    const staff = await User.query()
      .where('agencyId', agencyId)
      .where('role', 'staff')
      .select('id')
    const ids = staff.map((user) => user.id)
    if (ids.length === 0) return
    await db.from('auth_access_tokens').whereIn('tokenable_id', ids).delete()
  }
}
