import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Vehicle from '#models/vehicle'
import VehicleSale from '#models/vehicle_sale'
import ClientAccount from '#models/client_account'
import VehicleSaleService from '#services/vehicle_sale_service'
import MarketplaceClientService from '#services/marketplace_client_service'
import AdminNotificationService from '#services/admin_notification_service'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
import { includesSale } from '#constants/offer_types'
import {
  marketplaceSaleOfferValidator,
} from '#validators/vehicle_sale'

function nextStepsForStatus(status: string): string {
  if (status === 'pending') {
    return 'L’agence étudie votre offre. Vous serez notifié après acceptation ou refus.'
  }
  if (status === 'accepted') {
    return 'Offre acceptée. Contactez l’agence pour finaliser la vente.'
  }
  if (status === 'rejected') {
    return 'Cette offre a été refusée.'
  }
  if (status === 'cancelled') {
    return 'Vous avez annulé cette offre.'
  }
  if (status === 'sold') {
    return 'Félicitations, le véhicule vous a été vendu.'
  }
  return ''
}

export default class MarketplaceSalesController {
  #sales = new VehicleSaleService()
  #clients = new MarketplaceClientService()
  #notifications = new AdminNotificationService()

  async #account(auth: HttpContext['auth']) {
    return auth.use('marketplace').getUserOrFail() as ClientAccount
  }

  async #publishedForSale(vehicleId: number) {
    const vehicle = await Vehicle.query()
      .where('id', vehicleId)
      .whereIn('status', ['Disponible', 'Loué', 'À vendre'])
      .where('complianceHold', false)
      .where('marketplacePublicationStatus', 'published')
      .whereIn('offerType', ['sale', 'both'])
      .whereHas('agency', (aq) => {
        aq.where('isActive', true).where('publishOnMarketplace', true)
      })
      .preload('agency')
      .first()

    if (!vehicle || !includesSale(vehicle.offerType)) {
      throw new Exception('Véhicule non disponible à la vente sur le catalogue.', {
        status: 404,
        code: 'E_VEHICLE_UNAVAILABLE',
      })
    }
    return vehicle
  }

  #serialize(sale: VehicleSale) {
    const cover = sale.vehicle?.photos?.[0]
    return {
      id: sale.id,
      status: sale.status,
      offeredPrice: sale.offeredPrice,
      finalPrice: sale.finalPrice,
      notes: sale.notes,
      rejectReason: sale.rejectReason,
      nextSteps: nextStepsForStatus(sale.status),
      acceptedAt: sale.acceptedAt?.toISO?.() ?? null,
      rejectedAt: sale.rejectedAt?.toISO?.() ?? null,
      cancelledAt: sale.cancelledAt?.toISO?.() ?? null,
      soldAt: sale.soldAt?.toISO?.() ?? null,
      createdAt: sale.createdAt?.toISO?.() ?? null,
      vehicle: sale.vehicle
        ? {
            id: sale.vehicle.id,
            brand: sale.vehicle.brand,
            model: sale.vehicle.model,
            label: sale.vehicle.label,
            salePrice: sale.vehicle.salePrice,
            offerType: sale.vehicle.offerType,
            photoUrl: cover
              ? `/api/v1/marketplace/vehicles/${sale.vehicle.id}/photos/${cover.id}`
              : sale.vehicle.photoUrl,
            agency: sale.vehicle.agency
              ? {
                  id: sale.vehicle.agency.id,
                  name: sale.vehicle.agency.name,
                  city: sale.vehicle.agency.city
                    ? {
                        name: sale.vehicle.agency.city.name,
                        region: sale.vehicle.agency.city.region,
                      }
                    : null,
                }
              : null,
          }
        : null,
    }
  }

  async store({ auth, request, response }: HttpContext) {
    const account = await this.#account(auth)
    await account.load('client')
    const payload = await request.validateUsing(marketplaceSaleOfferValidator)
    const vehicle = await this.#publishedForSale(payload.vehicleId)

    if (payload.phone) {
      await this.#clients.applyBookingIdentity(account.client, {
        phone: payload.phone,
      })
      await account.client.refresh()
    }

    if (!account.client.phone || account.client.phone === 'À COMPLÉTER') {
      throw new Exception('Le numéro de téléphone est requis pour faire une offre.', {
        status: 422,
        code: 'E_PHONE_REQUIRED',
      })
    }

    const sale = await this.#sales.createOffer({
      agencyId: vehicle.agencyId,
      vehicleId: vehicle.id,
      clientId: account.client.id,
      clientAccountId: account.id,
      offeredPrice: payload.offeredPrice,
      notes: payload.notes ?? null,
    })

    await this.#notifications.notifyAgencyAdmins(vehicle.agencyId, {
      type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_BOOKING_REQUEST,
      title: 'Nouvelle offre d’achat',
      body: `${account.client.fullName} propose ${payload.offeredPrice.toLocaleString('fr-FR')} FCFA pour ${vehicle.label}.`,
      href: '/admin/sales',
      meta: { saleId: sale.id, vehicleId: vehicle.id, source: 'marketplace' },
    })

    return response.created({
      id: sale.id,
      status: sale.status,
      offeredPrice: sale.offeredPrice,
      vehicle: {
        id: vehicle.id,
        label: vehicle.label,
        salePrice: vehicle.salePrice,
        agencyName: vehicle.agency?.name ?? null,
      },
      nextSteps: nextStepsForStatus(sale.status),
    })
  }

  async index({ auth, response }: HttpContext) {
    const account = await this.#account(auth)
    const sales = await VehicleSale.query()
      .where('clientId', account.clientId)
      .preload('vehicle', (vq) =>
        vq
          .preload('agency', (aq) => aq.preload('city'))
          .preload('photos', (pq) => pq.orderBy('position', 'asc').orderBy('id', 'asc'))
      )
      .orderBy('id', 'desc')

    return response.ok({
      data: sales.map((sale) => this.#serialize(sale)),
    })
  }

  async show({ auth, params, response }: HttpContext) {
    const account = await this.#account(auth)
    const sale = await VehicleSale.query()
      .where('id', params.id)
      .where('clientId', account.clientId)
      .preload('vehicle', (vq) =>
        vq
          .preload('agency', (aq) => aq.preload('city'))
          .preload('photos', (pq) => pq.orderBy('position', 'asc').orderBy('id', 'asc'))
      )
      .firstOrFail()

    return response.ok(this.#serialize(sale))
  }

  async cancel({ auth, params, response }: HttpContext) {
    const account = await this.#account(auth)
    const sale = await VehicleSale.query()
      .where('id', params.id)
      .where('clientId', account.clientId)
      .preload('vehicle', (vq) =>
        vq
          .preload('agency', (aq) => aq.preload('city'))
          .preload('photos', (pq) => pq.orderBy('position', 'asc').orderBy('id', 'asc'))
      )
      .firstOrFail()

    await this.#sales.cancel(sale)
    await sale.refresh()

    return response.ok(this.#serialize(sale))
  }
}
