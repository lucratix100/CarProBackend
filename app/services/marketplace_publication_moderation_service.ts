import { DateTime } from 'luxon'
import Agency from '#models/agency'
import MarketplacePublicationEvent from '#models/marketplace_publication_event'
import Vehicle from '#models/vehicle'
import AdminNotificationService from '#services/admin_notification_service'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
import {
  MARKETPLACE_PUBLICATION_BAN_DAYS,
  MARKETPLACE_PUBLICATION_REJECTION_STREAK_LIMIT,
  type MarketplacePublicationEventAction,
} from '#constants/marketplace_publication'

type LogEventInput = {
  vehicle: Vehicle
  action: MarketplacePublicationEventAction
  reason?: string | null
  actorUserId?: number | null
}

export default class MarketplacePublicationModerationService {
  #notifications = new AdminNotificationService()

  async logEvent(input: LogEventInput) {
    return MarketplacePublicationEvent.create({
      vehicleId: input.vehicle.id,
      agencyId: input.vehicle.agencyId,
      action: input.action,
      reason: input.reason?.trim() || null,
      actorUserId: input.actorUserId ?? null,
      createdAt: DateTime.now(),
    })
  }

  async historyForVehicle(vehicleId: number, limit = 40) {
    const events = await MarketplacePublicationEvent.query()
      .where('vehicleId', vehicleId)
      .preload('actor')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      reason: event.reason,
      createdAt: event.createdAt.toISO(),
      actor: event.actor
        ? {
            id: event.actor.id,
            fullName: event.actor.fullName,
            email: event.actor.email,
          }
        : null,
    }))
  }

  isPublishBanned(agency: Agency) {
    if (!agency.marketplacePublishBannedUntil) return false
    return agency.marketplacePublishBannedUntil > DateTime.now()
  }

  async onApproved(agencyId: number) {
    const agency = await Agency.findOrFail(agencyId)
    agency.marketplaceRejectionStreak = 0
    await agency.save()
  }

  async onRejected(agencyId: number) {
    const agency = await Agency.findOrFail(agencyId)
    agency.marketplaceRejectionStreak = Number(agency.marketplaceRejectionStreak || 0) + 1

    let bannedNow = false
    if (agency.marketplaceRejectionStreak >= MARKETPLACE_PUBLICATION_REJECTION_STREAK_LIMIT) {
      agency.marketplacePublishBannedUntil = DateTime.now().plus({
        days: MARKETPLACE_PUBLICATION_BAN_DAYS,
      })
      agency.marketplaceRejectionStreak = 0
      bannedNow = true
    }

    await agency.save()

    if (bannedNow && agency.marketplacePublishBannedUntil) {
      const until = agency.marketplacePublishBannedUntil.toFormat('dd/LL/yyyy HH:mm')
      try {
        await this.#notifications.notifyAgencyAdmins(agencyId, {
          type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_PUBLICATION_BANNED,
          title: 'Publication catalogue temporairement suspendue',
          body: `Trop de refus récents. Vous pourrez renvoyer des annonces après le ${until}.`,
          href: '/admin/vehicles',
          meta: {
            bannedUntil: agency.marketplacePublishBannedUntil.toISO(),
          },
        })
      } catch {
        // ignore
      }
    }

    return { agency, bannedNow }
  }

  async clearPublishBan(agency: Agency) {
    agency.marketplacePublishBannedUntil = null
    agency.marketplaceRejectionStreak = 0
    await agency.save()
    return agency
  }
}
