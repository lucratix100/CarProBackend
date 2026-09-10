import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import ClientAccount from '#models/client_account'
import MarketplaceFavorite from '#models/marketplace_favorite'
import RentalService from '#services/rental_service'
import VehicleAvailableNotification from '#mails/vehicle_available_notification'
import { todayISO } from '#services/finance_service'
import type Vehicle from '#models/vehicle'

function formatCfa(amount: number) {
  return `${Math.round(Number(amount || 0)).toLocaleString('fr-FR')} FCFA`
}

export default class MarketplaceFavoriteNotifyService {
  #rentals = new RentalService()

  webClientBase() {
    return (
      env.get('WEB_CLIENT_URL') ||
      env.get('FRONTEND_URL') ||
      'http://localhost:3001'
    ).replace(/\/$/, '')
  }

  /**
   * Disponible « jour J » = statut Disponible + aucun conflit de location aujourd’hui.
   */
  async isAvailableToday(vehicle: Vehicle, today = todayISO()) {
    if (vehicle.status !== 'Disponible') return false
    if (vehicle.complianceHold) return false
    if (vehicle.marketplacePublicationStatus !== 'published') return false
    if (!vehicle.agency?.isActive || !vehicle.agency?.publishOnMarketplace) {
      // agency may not be preloaded — only enforce when present
      if (vehicle.agency) return false
    }
    const conflict = await this.#rentals.findConflict(vehicle.id, today, today)
    return !conflict
  }

  async notifyDueFavorites(today = todayISO()) {
    const favorites = await MarketplaceFavorite.query()
      .where('notifyAvailable', true)
      .preload('vehicle', (vq) => vq.preload('agency'))

    let sent = 0
    let reset = 0
    let skipped = 0

    for (const favorite of favorites) {
      const vehicle = favorite.vehicle
      const account = await ClientAccount.find(favorite.clientAccountId)
      if (!vehicle || !account?.email) {
        skipped++
        continue
      }

      const available = await this.isAvailableToday(vehicle, today)

      if (!available) {
        if (favorite.notifiedAt) {
          favorite.notifiedAt = null
          await favorite.save()
          reset++
        }
        continue
      }

      if (favorite.notifiedAt) {
        skipped++
        continue
      }

      const vehicleUrl = `${this.webClientBase()}/vehicles/${vehicle.id}`
      try {
        await mail.send(
          new VehicleAvailableNotification({
            email: account.email,
            fullName: account.fullName,
            vehicleLabel: vehicle.label,
            agencyName: vehicle.agency?.name ?? null,
            vehicleUrl,
            dailyPriceLabel: formatCfa(vehicle.dailyPrice),
          })
        )
        favorite.notifiedAt = DateTime.now()
        await favorite.save()
        sent++
        logger.info(
          { to: account.email, vehicleId: vehicle.id },
          '[favorites] Alerte disponibilité envoyée'
        )
      } catch (error) {
        logger.error(
          { err: error, to: account.email, vehicleId: vehicle.id },
          '[favorites] Échec envoi alerte disponibilité'
        )
      }
    }

    return { sent, reset, skipped, total: favorites.length }
  }
}
