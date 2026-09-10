import type { HttpContext } from '@adonisjs/core/http'
import ClientAccount from '#models/client_account'
import Rental from '#models/rental'
import Vehicle from '#models/vehicle'
import MarketplaceReviewService from '#services/marketplace_review_service'
import { marketplaceReviewValidator } from '#validators/marketplace'

export default class MarketplaceReviewController {
  #reviews = new MarketplaceReviewService()

  async #account(auth: HttpContext['auth']) {
    return auth.use('marketplace').getUserOrFail() as ClientAccount
  }

  async store({ auth, params, request, response }: HttpContext) {
    const account = await this.#account(auth)
    const payload = await request.validateUsing(marketplaceReviewValidator)
    const rental = await Rental.query()
      .where('id', params.id)
      .where('clientId', account.clientId)
      .where('source', 'marketplace')
      .firstOrFail()

    const review = await this.#reviews.createForBooking(rental, account.clientId, {
      cleanliness: payload.cleanliness,
      punctuality: payload.punctuality,
      vehicleCondition: payload.vehicleCondition,
      communication: payload.communication,
    }, payload.comment ?? null)

    return response.created(this.#reviews.serialize(review))
  }

  async forVehicle({ params, response }: HttpContext) {
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .where('status', 'Disponible')
      .where('complianceHold', false)
      .where('marketplacePublicationStatus', 'published')
      .whereHas('agency', (aq) => {
        aq.where('isActive', true).where('publishOnMarketplace', true)
      })
      .preload('agency')
      .firstOrFail()

    const [agencyRating, vehicleRating, reviews] = await Promise.all([
      this.#reviews.aggregateForAgency(vehicle.agencyId),
      this.#reviews.aggregatesForVehicles([vehicle.id]).then((m) => m.get(vehicle.id)!),
      this.#reviews.listForVehicle(vehicle.id, 30),
    ])

    return response.ok({
      agencyRating,
      vehicleRating,
      data: reviews,
    })
  }
}
