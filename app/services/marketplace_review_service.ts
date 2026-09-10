import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import MarketplaceReview from '#models/marketplace_review'
import Rental from '#models/rental'
import RentalService from '#services/rental_service'
import { resolveRentalStatus, todayISO } from '#services/finance_service'

export type ReviewCriteria = {
  cleanliness: number
  punctuality: number
  vehicleCondition: number
  communication: number
}

export type RatingAggregate = {
  avg: number | null
  count: number
}

function clampScore(value: number) {
  return Math.min(5, Math.max(1, Math.round(value)))
}

export function overallFromCriteria(criteria: ReviewCriteria) {
  const avg =
    (criteria.cleanliness +
      criteria.punctuality +
      criteria.vehicleCondition +
      criteria.communication) /
    4
  return Math.round(avg * 100) / 100
}

export default class MarketplaceReviewService {
  #rentals = new RentalService()

  serialize(review: MarketplaceReview) {
    return {
      id: review.id,
      rentalId: review.rentalId,
      agencyId: review.agencyId,
      vehicleId: review.vehicleId,
      overallScore: Number(review.overallScore),
      cleanliness: review.cleanliness,
      punctuality: review.punctuality,
      vehicleCondition: review.vehicleCondition,
      communication: review.communication,
      comment: review.comment,
      status: review.status,
      createdAt: review.createdAt?.toISO() ?? null,
    }
  }

  async aggregateForAgency(agencyId: number): Promise<RatingAggregate> {
    const map = await this.aggregatesForAgencies([agencyId])
    return map.get(agencyId) ?? { avg: null, count: 0 }
  }

  async aggregatesForAgencies(agencyIds: number[]): Promise<Map<number, RatingAggregate>> {
    const map = new Map<number, RatingAggregate>()
    const unique = [...new Set(agencyIds.filter(Boolean))]
    for (const id of unique) {
      map.set(id, { avg: null, count: 0 })
    }
    if (unique.length === 0) return map

    const rows = await db
      .from('marketplace_reviews')
      .whereIn('agency_id', unique)
      .where('status', 'published')
      .groupBy('agency_id')
      .select('agency_id')
      .avg('overall_score as avg')
      .count('* as total')

    for (const row of rows) {
      const agencyId = Number(row.agency_id)
      const count = Number(row.total || 0)
      const avg = count === 0 ? null : Math.round(Number(row.avg) * 10) / 10
      map.set(agencyId, { avg, count })
    }
    return map
  }

  async aggregatesForVehicles(vehicleIds: number[]): Promise<Map<number, RatingAggregate>> {
    const map = new Map<number, RatingAggregate>()
    const unique = [...new Set(vehicleIds.filter(Boolean))]
    for (const id of unique) {
      map.set(id, { avg: null, count: 0 })
    }
    if (unique.length === 0) return map

    const rows = await db
      .from('marketplace_reviews')
      .whereIn('vehicle_id', unique)
      .where('status', 'published')
      .groupBy('vehicle_id')
      .select('vehicle_id')
      .avg('overall_score as avg')
      .count('* as total')

    for (const row of rows) {
      const vehicleId = Number(row.vehicle_id)
      const count = Number(row.total || 0)
      const avg = count === 0 ? null : Math.round(Number(row.avg) * 10) / 10
      map.set(vehicleId, { avg, count })
    }
    return map
  }

  async listForAgency(agencyId: number, limit = 20) {
    const reviews = await MarketplaceReview.query()
      .where('agencyId', agencyId)
      .where('status', 'published')
      .orderBy('id', 'desc')
      .limit(limit)
    return reviews.map((r) => this.serialize(r))
  }

  async listForVehicle(vehicleId: number, limit = 20) {
    const reviews = await MarketplaceReview.query()
      .where('vehicleId', vehicleId)
      .where('status', 'published')
      .orderBy('id', 'desc')
      .limit(limit)
    return reviews.map((r) => this.serialize(r))
  }

  async findByRentalIds(rentalIds: number[]) {
    if (rentalIds.length === 0) return new Map<number, MarketplaceReview>()
    const reviews = await MarketplaceReview.query().whereIn('rentalId', rentalIds)
    return new Map(reviews.map((r) => [r.rentalId, r]))
  }

  /**
   * Recalcule le statut calendaire d’une location confirmée (hors En attente / Annulée).
   */
  async syncRentalStatus(rental: Rental) {
    if (['Annulée', 'En attente'].includes(rental.status)) return rental

    const startDate = rental.startDate.toISODate()!
    const endDate = rental.endDate.toISODate()!
    const next = resolveRentalStatus(startDate, endDate, todayISO())
    if (rental.status === next) return rental

    rental.status = next
    await rental.save()
    await this.#rentals.syncVehicleStatus(rental.vehicleId)
    await this.#rentals.upsertInvoiceForRental(rental)
    return rental
  }

  async createForBooking(
    rental: Rental,
    clientId: number,
    criteria: ReviewCriteria,
    comment?: string | null
  ) {
    await this.syncRentalStatus(rental)

    if (rental.clientId !== clientId) {
      throw new Exception('Cette réservation ne vous appartient pas.', {
        status: 403,
        code: 'E_REVIEW_FORBIDDEN',
      })
    }
    if (rental.source !== 'marketplace') {
      throw new Exception('Seules les locations marketplace peuvent être notées.', {
        status: 422,
        code: 'E_REVIEW_SOURCE',
      })
    }
    if (rental.status !== 'Terminée') {
      throw new Exception('Vous pourrez noter cette location une fois terminée.', {
        status: 422,
        code: 'E_REVIEW_NOT_READY',
      })
    }

    const existing = await MarketplaceReview.query().where('rentalId', rental.id).first()
    if (existing) {
      throw new Exception('Vous avez déjà noté cette réservation.', {
        status: 422,
        code: 'E_REVIEW_EXISTS',
      })
    }

    const payload = {
      cleanliness: clampScore(criteria.cleanliness),
      punctuality: clampScore(criteria.punctuality),
      vehicleCondition: clampScore(criteria.vehicleCondition),
      communication: clampScore(criteria.communication),
    }

    const review = await MarketplaceReview.create({
      rentalId: rental.id,
      clientId,
      agencyId: rental.agencyId,
      vehicleId: rental.vehicleId,
      overallScore: String(overallFromCriteria(payload)),
      cleanliness: payload.cleanliness,
      punctuality: payload.punctuality,
      vehicleCondition: payload.vehicleCondition,
      communication: payload.communication,
      comment: comment?.trim() ? comment.trim().slice(0, 2000) : null,
      status: 'published',
    })

    return review
  }
}
