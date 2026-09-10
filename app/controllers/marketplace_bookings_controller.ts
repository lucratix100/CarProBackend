import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Vehicle from '#models/vehicle'
import Rental from '#models/rental'
import ClientAccount from '#models/client_account'
import RentalService from '#services/rental_service'
import MarketplaceClientService from '#services/marketplace_client_service'
import MarketplaceReviewService from '#services/marketplace_review_service'
import AdminNotificationService from '#services/admin_notification_service'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
import { daysBetween, rentalFinancials } from '#services/finance_service'
import {
  cancelMarketplaceBookingValidator,
  marketplaceBookingValidator,
} from '#validators/rental'

function nextStepsForStatus(status: string, canReview: boolean): string {
  if (status === 'En attente') {
    return 'L’agence étudie votre demande. Vous serez notifié après validation ou refus.'
  }
  if (status === 'Réservée') {
    return 'Réservation confirmée. Présentez-vous à l’agence le jour du départ avec vos documents.'
  }
  if (status === 'En cours') {
    return 'Location en cours. Bonne route !'
  }
  if (status === 'Terminée') {
    return canReview
      ? 'Location terminée. Partagez votre avis pour aider les autres clients.'
      : 'Location terminée. Merci d’avoir choisi carPro.'
  }
  if (status === 'Annulée') {
    return 'Cette demande a été annulée.'
  }
  return ''
}

export default class MarketplaceBookingsController {
  #rentals = new RentalService()
  #clients = new MarketplaceClientService()
  #notifications = new AdminNotificationService()
  #reviews = new MarketplaceReviewService()

  async #account(auth: HttpContext['auth']) {
    return auth.use('marketplace').getUserOrFail() as ClientAccount
  }

  async #publishedVehicle(vehicleId: number) {
    const vehicle = await Vehicle.query()
      .where('id', vehicleId)
      .where('status', 'Disponible')
      .where('complianceHold', false)
      .where('marketplacePublicationStatus', 'published')
      .whereHas('agency', (aq) => {
        aq.where('isActive', true).where('publishOnMarketplace', true)
      })
      .preload('agency')
      .first()

    if (!vehicle) {
      throw new Exception('Véhicule non disponible sur le catalogue.', {
        status: 404,
        code: 'E_VEHICLE_UNAVAILABLE',
      })
    }
    return vehicle
  }

  async store({ auth, request, response }: HttpContext) {
    const account = await this.#account(auth)
    await account.load('client')
    const payload = await request.validateUsing(marketplaceBookingValidator)
    const vehicle = await this.#publishedVehicle(payload.vehicleId)

    await this.#clients.applyBookingIdentity(account.client, {
      phone: payload.phone,
      licenseNumber: payload.licenseNumber,
      licenseExpiresAt: payload.licenseExpiresAt,
      idCardNumber: payload.idCardNumber,
    })

    await account.client.refresh()

    if (!account.client.phone || account.client.phone === 'À COMPLÉTER') {
      throw new Exception('Le numéro de téléphone est requis pour réserver.', {
        status: 422,
        code: 'E_PHONE_REQUIRED',
      })
    }

    if (!account.client.licenseNumber?.trim()) {
      throw new Exception('Le numéro de permis est requis pour réserver.', {
        status: 422,
        code: 'E_LICENSE_REQUIRED',
      })
    }

    if (!account.client.idCardNumber?.trim()) {
      throw new Exception('Le numéro de CIN est requis pour réserver.', {
        status: 422,
        code: 'E_CIN_REQUIRED',
      })
    }

    if (!account.client.licenseExpiresAt) {
      throw new Exception('La date d’expiration du permis est requise pour réserver.', {
        status: 422,
        code: 'E_LICENSE_EXPIRES_REQUIRED',
      })
    }

    const scheduleParts = [
      payload.pickupTime ? `départ ${payload.pickupTime}` : null,
      payload.returnTime ? `retour ${payload.returnTime}` : null,
    ].filter(Boolean)
    const scheduleNote =
      scheduleParts.length > 0 ? `Horaires : ${scheduleParts.join(' · ')}` : null
    const notes = [payload.notes?.trim() || null, scheduleNote]
      .filter(Boolean)
      .join('\n')

    const rental = await this.#rentals.create({
      agencyId: vehicle.agencyId,
      vehicleId: vehicle.id,
      clientId: account.client.id,
      startDate: payload.startDate,
      endDate: payload.endDate,
      dailyPrice: vehicle.dailyPrice,
      amountPaid: 0,
      status: 'En attente',
      notes: notes || null,
      source: 'marketplace',
    })

    const days = daysBetween(payload.startDate, payload.endDate)
    const timeHint =
      payload.pickupTime || payload.returnTime
        ? ` (${payload.pickupTime || '—'} → ${payload.returnTime || '—'})`
        : ''
    await this.#notifications.notifyAgencyAdmins(vehicle.agencyId, {
      type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_BOOKING_REQUEST,
      title: 'Nouvelle demande de réservation',
      body: `${account.client.fullName} demande ${vehicle.label} du ${payload.startDate} au ${payload.endDate}${timeHint} (${days} j).`,
      href: '/admin/rentals',
      meta: { rentalId: rental.id, vehicleId: vehicle.id, source: 'marketplace' },
    })

    return response.created({
      id: rental.id,
      status: rental.status,
      startDate: payload.startDate,
      endDate: payload.endDate,
      dailyPrice: rental.dailyPrice,
      vehicle: {
        id: vehicle.id,
        label: vehicle.label,
        agencyName: vehicle.agency?.name ?? null,
      },
    })
  }

  async index({ auth, response }: HttpContext) {
    const account = await this.#account(auth)
    const rentals = await Rental.query()
      .where('clientId', account.clientId)
      .where('source', 'marketplace')
      .preload('vehicle', (vq) =>
        vq
          .preload('agency', (aq) => aq.preload('city'))
          .preload('photos', (pq) => pq.orderBy('position', 'asc').orderBy('id', 'asc'))
      )
      .orderBy('id', 'desc')

    for (const rental of rentals) {
      await this.#reviews.syncRentalStatus(rental)
    }

    const reviewMap = await this.#reviews.findByRentalIds(rentals.map((r) => r.id))

    const data = []
    for (const rental of rentals) {
      const finance = await rentalFinancials(rental)
      const existing = reviewMap.get(rental.id)
      const canReview = rental.status === 'Terminée' && !existing
      const cover = rental.vehicle?.photos?.[0]
      data.push({
        id: rental.id,
        status: rental.status,
        startDate: rental.startDate.toISODate(),
        endDate: rental.endDate.toISODate(),
        dailyPrice: rental.dailyPrice,
        source: rental.source,
        cancelReason: rental.cancelReason,
        canReview,
        review: existing ? this.#reviews.serialize(existing) : null,
        nextSteps: nextStepsForStatus(rental.status, canReview),
        finance: { days: finance.days, grossTotal: finance.grossTotal, ttc: finance.ttc },
        vehicle: rental.vehicle
          ? {
              id: rental.vehicle.id,
              brand: rental.vehicle.brand,
              model: rental.vehicle.model,
              label: rental.vehicle.label,
              photoUrl: cover
                ? `/api/v1/marketplace/vehicles/${rental.vehicle.id}/photos/${cover.id}`
                : rental.vehicle.photoUrl,
              agency: rental.vehicle.agency
                ? {
                    id: rental.vehicle.agency.id,
                    name: rental.vehicle.agency.name,
                    city: rental.vehicle.agency.city
                      ? {
                          name: rental.vehicle.agency.city.name,
                          region: rental.vehicle.agency.city.region,
                        }
                      : null,
                  }
                : null,
            }
          : null,
      })
    }

    return response.ok({ data })
  }

  async show({ auth, params, response }: HttpContext) {
    const account = await this.#account(auth)
    const rental = await Rental.query()
      .where('id', params.id)
      .where('clientId', account.clientId)
      .where('source', 'marketplace')
      .preload('vehicle', (vq) => vq.preload('agency'))
      .firstOrFail()

    await this.#reviews.syncRentalStatus(rental)
    const reviewMap = await this.#reviews.findByRentalIds([rental.id])
    const existing = reviewMap.get(rental.id)
    const canReview = rental.status === 'Terminée' && !existing
    const finance = await rentalFinancials(rental)

    return response.ok({
      id: rental.id,
      status: rental.status,
      startDate: rental.startDate.toISODate(),
      endDate: rental.endDate.toISODate(),
      dailyPrice: rental.dailyPrice,
      notes: rental.notes,
      cancelReason: rental.cancelReason,
      canReview,
      review: existing ? this.#reviews.serialize(existing) : null,
      nextSteps: nextStepsForStatus(rental.status, canReview),
      finance,
      vehicle: rental.vehicle
        ? {
            id: rental.vehicle.id,
            label: rental.vehicle.label,
            brand: rental.vehicle.brand,
            model: rental.vehicle.model,
            agency: rental.vehicle.agency
              ? { id: rental.vehicle.agency.id, name: rental.vehicle.agency.name }
              : null,
          }
        : null,
    })
  }

  async cancel({ auth, params, request, response }: HttpContext) {
    const account = await this.#account(auth)
    const payload = await request.validateUsing(cancelMarketplaceBookingValidator)
    const rental = await Rental.query()
      .where('id', params.id)
      .where('clientId', account.clientId)
      .where('source', 'marketplace')
      .preload('vehicle')
      .firstOrFail()

    if (!['En attente', 'Réservée'].includes(rental.status)) {
      throw new Exception(
        'Vous ne pouvez annuler que les demandes en attente ou réservées. Contactez l’agence.',
        { status: 422, code: 'E_CANCEL_FORBIDDEN' }
      )
    }

    await this.#rentals.cancel(rental, {
      reason: payload.reason ?? 'Annulation client',
      cancelledBy: 'client',
    })

    await this.#notifications.notifyAgencyAdmins(rental.agencyId, {
      type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_BOOKING_CANCELLED,
      title: 'Réservation annulée par le client',
      body: `${account.fullName || 'Client'} a annulé la demande #${rental.id}${
        payload.reason ? ` : ${payload.reason}` : ''
      }.`,
      href: '/admin/rentals',
      meta: { rentalId: rental.id, cancelledBy: 'client' },
    })

    return response.ok({ id: rental.id, status: 'Annulée' })
  }
}
