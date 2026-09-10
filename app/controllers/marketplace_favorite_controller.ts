import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import ClientAccount from '#models/client_account'
import MarketplaceFavorite from '#models/marketplace_favorite'
import Vehicle from '#models/vehicle'
import MarketplaceReviewService from '#services/marketplace_review_service'
import MarketplaceFavoriteNotifyService from '#services/marketplace_favorite_notify_service'
import {
  marketplaceFavoriteNotifyValidator,
  marketplaceFavoriteValidator,
} from '#validators/marketplace'

export default class MarketplaceFavoriteController {
  #reviews = new MarketplaceReviewService()
  #notify = new MarketplaceFavoriteNotifyService()

  async #account(auth: HttpContext['auth']) {
    return auth.use('marketplace').getUserOrFail() as ClientAccount
  }

  #photoUrls(vehicle: Vehicle) {
    const photos = (vehicle.photos ?? []).map((photo) => ({
      id: photo.id,
      position: photo.position,
      url: `/api/v1/marketplace/vehicles/${vehicle.id}/photos/${photo.id}`,
    }))
    return {
      photos,
      photosCount: photos.length,
      photoUrl: photos[0]?.url ?? null,
    }
  }

  async index({ auth, response }: HttpContext) {
    const account = await this.#account(auth)
    const favorites = await MarketplaceFavorite.query()
      .where('clientAccountId', account.id)
      .preload('vehicle', (vq) => {
        vq.preload('agency', (aq) => aq.preload('city'))
          .preload('photos', (pq) => pq.orderBy('position').orderBy('id'))
      })
      .orderBy('id', 'desc')

    const agencyRatings = await this.#reviews.aggregatesForAgencies(
      favorites.map((f) => f.vehicle?.agencyId).filter((id): id is number => Boolean(id))
    )

    const data = []
    for (const favorite of favorites) {
      if (!favorite.vehicle) continue
      const vehicle = favorite.vehicle
      const rating = agencyRatings.get(vehicle.agencyId) ?? { avg: null, count: 0 }
      const availableToday = await this.#notify.isAvailableToday(vehicle)
      data.push({
        id: favorite.id,
        vehicleId: favorite.vehicleId,
        notifyAvailable: favorite.notifyAvailable,
        notifiedAt: favorite.notifiedAt?.toISO() ?? null,
        availableToday,
        canEnableAlert: !availableToday,
        createdAt: favorite.createdAt?.toISO() ?? null,
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          fuel: vehicle.fuel,
          vehicleType: vehicle.vehicleType,
          dailyPrice: vehicle.dailyPrice,
          label: vehicle.label,
          status: vehicle.status,
          ratingAvg: rating.avg,
          ratingCount: rating.count,
          agency: vehicle.agency
            ? {
                id: vehicle.agency.id,
                name: vehicle.agency.name,
                slug: vehicle.agency.slug,
                city: vehicle.agency.city
                  ? {
                      id: vehicle.agency.city.id,
                      name: vehicle.agency.city.name,
                      region: vehicle.agency.city.region,
                    }
                  : null,
                ratingAvg: rating.avg,
                ratingCount: rating.count,
              }
            : null,
          ...this.#photoUrls(vehicle),
        },
      })
    }

    return response.ok({ data })
  }

  async ids({ auth, response }: HttpContext) {
    const account = await this.#account(auth)
    const rows = await MarketplaceFavorite.query()
      .where('clientAccountId', account.id)
      .select('vehicle_id')
    return response.ok({
      data: rows.map((r) => r.vehicleId),
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const account = await this.#account(auth)
    const payload = await request.validateUsing(marketplaceFavoriteValidator)

    const vehicle = await Vehicle.query()
      .where('id', payload.vehicleId)
      .where('marketplacePublicationStatus', 'published')
      .whereHas('agency', (aq) => {
        aq.where('isActive', true).where('publishOnMarketplace', true)
      })
      .first()

    if (!vehicle) {
      throw new Exception('Véhicule introuvable sur le catalogue.', {
        status: 404,
        code: 'E_VEHICLE_MISSING',
      })
    }

    const availableToday = await this.#notify.isAvailableToday(vehicle)
    if (payload.notifyAvailable && availableToday) {
      throw new Exception(
        'Ce véhicule est déjà disponible aujourd’hui — l’alerte n’est pas nécessaire.',
        { status: 422, code: 'E_ALERT_NOT_NEEDED' }
      )
    }

    let favorite = await MarketplaceFavorite.query()
      .where('clientAccountId', account.id)
      .where('vehicleId', vehicle.id)
      .first()

    if (!favorite) {
      favorite = await MarketplaceFavorite.create({
        clientAccountId: account.id,
        vehicleId: vehicle.id,
        notifyAvailable: payload.notifyAvailable ?? false,
        notifiedAt: null,
      })
    } else if (payload.notifyAvailable !== undefined) {
      favorite.notifyAvailable = payload.notifyAvailable
      if (payload.notifyAvailable) favorite.notifiedAt = null
      await favorite.save()
    }

    return response.created({
      id: favorite.id,
      vehicleId: favorite.vehicleId,
      notifyAvailable: favorite.notifyAvailable,
      availableToday,
    })
  }

  async updateNotify({ auth, params, request, response }: HttpContext) {
    const account = await this.#account(auth)
    const payload = await request.validateUsing(marketplaceFavoriteNotifyValidator)
    const favorite = await MarketplaceFavorite.query()
      .where('clientAccountId', account.id)
      .where('vehicleId', params.vehicleId)
      .preload('vehicle')
      .firstOrFail()

    if (payload.notifyAvailable) {
      if (!favorite.vehicle) {
        throw new Exception('Véhicule introuvable.', { status: 404, code: 'E_VEHICLE_MISSING' })
      }
      const availableToday = await this.#notify.isAvailableToday(favorite.vehicle)
      if (availableToday) {
        throw new Exception(
          'Ce véhicule est déjà disponible aujourd’hui — l’alerte n’est pas nécessaire.',
          { status: 422, code: 'E_ALERT_NOT_NEEDED' }
        )
      }
      favorite.notifyAvailable = true
      favorite.notifiedAt = null
    } else {
      favorite.notifyAvailable = false
      favorite.notifiedAt = null
    }

    await favorite.save()

    return response.ok({
      id: favorite.id,
      vehicleId: favorite.vehicleId,
      notifyAvailable: favorite.notifyAvailable,
      notifiedAt: null,
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const account = await this.#account(auth)
    const favorite = await MarketplaceFavorite.query()
      .where('clientAccountId', account.id)
      .where('vehicleId', params.vehicleId)
      .first()

    if (favorite) {
      await favorite.delete()
    }

    return response.ok({ vehicleId: Number(params.vehicleId), removed: true })
  }
}
