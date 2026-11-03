import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import Vehicle from '#models/vehicle'
import VehicleSale from '#models/vehicle_sale'
import VehicleExpense from '#models/vehicle_expense'
import Rental from '#models/rental'
import { includesSale } from '#constants/offer_types'
import { resetVehicleBoost } from '#services/marketplace_boost_service'
import MarketplacePublicationModerationService from '#services/marketplace_publication_moderation_service'
import OwnerNotificationService from '#services/owner_notification_service'
import RentalService from '#services/rental_service'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'

export default class VehicleSaleService {
  #moderation = new MarketplacePublicationModerationService()
  #ownerNotifications = new OwnerNotificationService()
  #rentals = new RentalService()

  async assertVehicleForSale(vehicle: Vehicle) {
    if (vehicle.status === 'Vendu') {
      throw new Exception('Ce véhicule est déjà vendu.', {
        status: 422,
        code: 'E_VEHICLE_SOLD',
      })
    }
    if (!includesSale(vehicle.offerType)) {
      throw new Exception('Ce véhicule n’est pas proposé à la vente.', {
        status: 422,
        code: 'E_NOT_FOR_SALE',
      })
    }
    if (!vehicle.salePrice || Number(vehicle.salePrice) <= 0) {
      throw new Exception('Prix de vente manquant sur ce véhicule.', {
        status: 422,
        code: 'E_SALE_PRICE_REQUIRED',
      })
    }
  }

  async createOffer(payload: {
    agencyId: number
    vehicleId: number
    clientId: number
    clientAccountId?: number | null
    offeredPrice: number
    notes?: string | null
    createdByUserId?: number | null
  }) {
    const vehicle = await Vehicle.query()
      .where('id', payload.vehicleId)
      .where('agencyId', payload.agencyId)
      .firstOrFail()

    await this.assertVehicleForSale(vehicle)

    const existing = await VehicleSale.query()
      .where('vehicleId', vehicle.id)
      .where('clientId', payload.clientId)
      .whereIn('status', ['pending', 'accepted'])
      .first()

    if (existing) {
      throw new Exception('Une offre active existe déjà pour ce véhicule.', {
        status: 422,
        code: 'E_SALE_OFFER_EXISTS',
      })
    }

    return VehicleSale.create({
      agencyId: payload.agencyId,
      vehicleId: payload.vehicleId,
      clientId: payload.clientId,
      clientAccountId: payload.clientAccountId ?? null,
      offeredPrice: payload.offeredPrice,
      finalPrice: null,
      status: 'pending',
      notes: payload.notes ?? null,
      rejectReason: null,
      acceptedAt: null,
      rejectedAt: null,
      cancelledAt: null,
      soldAt: null,
      createdByUserId: payload.createdByUserId ?? null,
      updatedByUserId: payload.createdByUserId ?? null,
    })
  }

  async accept(sale: VehicleSale, userId?: number | null) {
    if (sale.status !== 'pending') {
      throw new Exception('Seule une offre en attente peut être acceptée.', {
        status: 422,
        code: 'E_INVALID_SALE_STATUS',
      })
    }
    sale.status = 'accepted'
    sale.finalPrice = sale.offeredPrice
    sale.acceptedAt = DateTime.now()
    sale.updatedByUserId = userId ?? sale.updatedByUserId
    await sale.save()
    return sale
  }

  async reject(sale: VehicleSale, reason: string, userId?: number | null) {
    if (sale.status !== 'pending' && sale.status !== 'accepted') {
      throw new Exception('Cette offre ne peut plus être refusée.', {
        status: 422,
        code: 'E_INVALID_SALE_STATUS',
      })
    }
    sale.status = 'rejected'
    sale.rejectReason = reason
    sale.rejectedAt = DateTime.now()
    sale.updatedByUserId = userId ?? sale.updatedByUserId
    await sale.save()
    return sale
  }

  async cancel(sale: VehicleSale) {
    if (sale.status !== 'pending') {
      throw new Exception('Seule une offre en attente peut être annulée.', {
        status: 422,
        code: 'E_INVALID_SALE_STATUS',
      })
    }
    sale.status = 'cancelled'
    sale.cancelledAt = DateTime.now()
    await sale.save()
    return sale
  }

  async markSold(
    sale: VehicleSale,
    options?: {
      finalPrice: number
      agencyCommission?: number
      paidCommission?: number
      notes?: string | null
      userId?: number | null
    }
  ) {
    if (!['pending', 'accepted'].includes(sale.status)) {
      throw new Exception('Cette offre ne peut pas être marquée comme vendue.', {
        status: 422,
        code: 'E_INVALID_SALE_STATUS',
      })
    }

    const activeRental = await Rental.query()
      .where('vehicleId', sale.vehicleId)
      .where('status', 'En cours')
      .first()
    if (activeRental) {
      throw new Exception('Une location est en cours sur ce véhicule. Terminez-la avant de le vendre.', {
        status: 422,
        code: 'E_RENTAL_IN_PROGRESS',
      })
    }

    const vehiclePreview = await Vehicle.findOrFail(sale.vehicleId)
    const finalPrice = options?.finalPrice ?? sale.offeredPrice
    const isOwnerVehicle = vehiclePreview.ownerId !== null
    const agencyCommission = isOwnerVehicle ? Number(options?.agencyCommission ?? 0) : 0
    const paidCommission = Number(options?.paidCommission ?? 0)

    if (agencyCommission > finalPrice) {
      throw new Exception('La commission agence ne peut pas dépasser le prix de vente.', {
        status: 422,
        code: 'E_COMMISSION_TOO_HIGH',
      })
    }

    await db.transaction(async (trx) => {
      sale.useTransaction(trx)
      sale.status = 'sold'
      sale.finalPrice = finalPrice
      sale.agencyCommission = agencyCommission
      sale.paidCommission = paidCommission
      sale.soldAt = DateTime.now()
      if (options?.notes !== undefined) {
        sale.notes = options.notes
      }
      sale.updatedByUserId = options?.userId ?? sale.updatedByUserId
      await sale.save()

      const vehicle = await Vehicle.query({ client: trx })
        .where('id', sale.vehicleId)
        .forUpdate()
        .firstOrFail()

      const wasPublished = vehicle.marketplacePublicationStatus === 'published'
      vehicle.status = 'Vendu'
      vehicle.marketplacePublicationStatus = 'draft'
      vehicle.marketplaceSubmittedAt = null
      vehicle.marketplaceReviewedAt = null
      vehicle.marketplaceReviewedByUserId = null
      vehicle.marketplaceRejectionReason = null
      resetVehicleBoost(vehicle)
      vehicle.updatedByUserId = options?.userId ?? vehicle.updatedByUserId
      await vehicle.save()

      if (wasPublished) {
        await this.#moderation.logEvent({
          vehicle,
          action: 'agency_unpublished',
          actorUserId: options?.userId ?? null,
          reason: `Véhicule vendu (offre #${sale.id})`,
        })
      }

      const otherOffers = await VehicleSale.query({ client: trx })
        .where('vehicleId', sale.vehicleId)
        .where('id', '!=', sale.id)
        .whereIn('status', ['pending', 'accepted'])

      for (const other of otherOffers) {
        other.useTransaction(trx)
        other.status = 'rejected'
        other.rejectReason = 'Véhicule vendu à un autre acheteur.'
        other.rejectedAt = DateTime.now()
        await other.save()
      }

      if (paidCommission > 0) {
        await VehicleExpense.create(
          {
            agencyId: sale.agencyId,
            vehicleId: sale.vehicleId,
            type: 'Commission',
            amount: paidCommission,
            spentOn: DateTime.now().startOf('day'),
            provider: null,
            notes: `Commission versée à la vente (offre #${sale.id})`,
            cancelledAt: null,
            cancelReason: null,
            createdByUserId: options?.userId ?? null,
          },
          { client: trx }
        )
      }

      if (vehicle.ownerId) {
        const ownerNet = Math.max(0, finalPrice - agencyCommission)
        await this.#ownerNotifications.notify(vehicle.ownerId, {
          type: OWNER_NOTIFICATION_TYPES.VEHICLE_STATUS_CHANGED,
          title: 'Véhicule vendu',
          body: `${vehicle.label} (${vehicle.plate}) a été vendu par l’agence. Net propriétaire : ${ownerNet} FCFA.`,
          meta: {
            vehicleId: vehicle.id,
            saleId: sale.id,
            status: 'Vendu',
            finalPrice,
            agencyCommission,
            ownerNet,
          },
        })
      }
    })

    const openRentals = await Rental.query()
      .where('vehicleId', sale.vehicleId)
      .whereIn('status', ['En attente', 'Réservée'])

    for (const rental of openRentals) {
      await this.#rentals.cancel(rental, {
        reason: 'Véhicule vendu par l’agence.',
        cancelledBy: 'agency',
      })
    }

    await sale.refresh()
    return sale
  }
}
