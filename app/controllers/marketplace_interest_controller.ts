import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import { DateTime } from 'luxon'
import env from '#start/env'
import ClientAccount from '#models/client_account'
import MarketplaceInterest from '#models/marketplace_interest'
import User from '#models/user'
import Vehicle from '#models/vehicle'
import AdminNotificationService from '#services/admin_notification_service'
import MarketplaceClientService from '#services/marketplace_client_service'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
import { includesSale } from '#constants/offer_types'
import { marketplaceInterestValidator } from '#validators/marketplace'

function isPhoneComplete(phone?: string | null) {
  if (!phone) return false
  const n = phone.trim().toLowerCase()
  return n.length >= 5 && n !== 'à compléter' && n !== 'a completer'
}

/** Digits only E.164-ish for wa.me (Senegal-friendly). */
export function toWhatsappDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  let local = digits
  if (local.startsWith('00221')) local = local.slice(5)
  else if (local.startsWith('221') && local.length > 9) local = local.slice(3)
  if (local.startsWith('0') && local.length > 8) local = local.slice(1)

  if (local.length === 9) return `221${local}`
  if (digits.startsWith('00') && digits.length >= 11) return digits.slice(2)
  if (digits.length >= 10) return digits
  return null
}

function buildWhatsappUrl(phone: string | null | undefined, text: string) {
  if (!phone) return null
  const digits = toWhatsappDigits(phone)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

function webClientBase() {
  return (
    env.get('WEB_CLIENT_URL') ||
    env.get('FRONTEND_URL') ||
    'http://localhost:3001'
  ).replace(/\/$/, '')
}

export default class MarketplaceInterestController {
  #notifications = new AdminNotificationService()
  #clients = new MarketplaceClientService()

  async #account(auth: HttpContext['auth']) {
    return auth.use('marketplace').getUserOrFail() as ClientAccount
  }

  async #agencyContactPhone(agencyId: number) {
    const admin = await User.query()
      .where('agencyId', agencyId)
      .where('role', 'admin')
      .where('status', 'active')
      .whereNotNull('phone')
      .orderBy('id', 'asc')
      .first()
    return isPhoneComplete(admin?.phone) ? admin!.phone!.trim() : null
  }

  async ids({ auth, response }: HttpContext) {
    const account = await this.#account(auth)
    const rows = await MarketplaceInterest.query()
      .where('clientAccountId', account.id)
      .select('vehicle_id')
    return response.ok({
      data: rows.map((r) => r.vehicleId),
    })
  }

  async index({ auth, response }: HttpContext) {
    const account = await this.#account(auth)
    const interests = await MarketplaceInterest.query()
      .where('clientAccountId', account.id)
      .preload('vehicle', (vq) => {
        vq.preload('agency', (aq) => aq.preload('city')).preload('photos', (pq) =>
          pq.orderBy('position').orderBy('id')
        )
      })
      .orderBy('id', 'desc')

    return response.ok({
      data: interests.map((interest) => ({
        id: interest.id,
        vehicleId: interest.vehicleId,
        agencyId: interest.agencyId,
        createdAt: interest.createdAt?.toISO() ?? null,
        vehicle: interest.vehicle
          ? {
              id: interest.vehicle.id,
              brand: interest.vehicle.brand,
              model: interest.vehicle.model,
              label: interest.vehicle.label,
              dailyPrice: interest.vehicle.dailyPrice,
              agency: interest.vehicle.agency
                ? {
                    id: interest.vehicle.agency.id,
                    name: interest.vehicle.agency.name,
                    slug: interest.vehicle.agency.slug,
                    city: interest.vehicle.agency.city
                      ? {
                          id: interest.vehicle.agency.city.id,
                          name: interest.vehicle.agency.city.name,
                          region: interest.vehicle.agency.city.region,
                        }
                      : null,
                  }
                : null,
              photoUrl: interest.vehicle.photos?.[0]
                ? `/api/v1/marketplace/vehicles/${interest.vehicle.id}/photos/${interest.vehicle.photos[0].id}`
                : null,
            }
          : null,
      })),
    })
  }

  /**
   * Liste des leads « intéressé » pour l’agence connectée (admin).
   */
  async agencyIndex({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail() as User
    if (!user.agencyId || (user.role !== 'admin' && user.role !== 'staff')) {
      throw new Exception('Accès réservé à l’agence.', { status: 403, code: 'E_FORBIDDEN' })
    }

    const interests = await MarketplaceInterest.query()
      .where('agencyId', user.agencyId)
      .preload('vehicle')
      .preload('clientAccount')
      .orderBy('id', 'desc')
      .limit(100)

    return response.ok({
      data: interests.map((interest) => ({
        id: interest.id,
        vehicleId: interest.vehicleId,
        clientName: interest.clientName,
        clientPhone: interest.clientPhone,
        message: interest.message,
        notifiedAt: interest.notifiedAt?.toISO() ?? null,
        createdAt: interest.createdAt?.toISO() ?? null,
        vehicle: interest.vehicle
          ? {
              id: interest.vehicle.id,
              label: interest.vehicle.label,
              brand: interest.vehicle.brand,
              model: interest.vehicle.model,
            }
          : null,
        clientAccount: interest.clientAccount
          ? {
              id: interest.clientAccount.id,
              email: interest.clientAccount.email,
              fullName: interest.clientAccount.fullName,
              phone: interest.clientAccount.phone,
            }
          : null,
      })),
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const account = await this.#account(auth)
    await account.load('client')
    const payload = await request.validateUsing(marketplaceInterestValidator)

    const vehicle = await Vehicle.query()
      .where('id', payload.vehicleId)
      .where('marketplacePublicationStatus', 'published')
      .whereHas('agency', (aq) => {
        aq.where('isActive', true).where('publishOnMarketplace', true)
      })
      .preload('agency')
      .first()

    if (!vehicle) {
      throw new Exception('Véhicule introuvable sur le catalogue.', {
        status: 404,
        code: 'E_VEHICLE_MISSING',
      })
    }

    if (!includesSale(vehicle.offerType)) {
      throw new Exception(
        '« Je suis intéressé » est réservé aux véhicules en vente. Utilisez le like pour la location.',
        { status: 422, code: 'E_INTEREST_SALE_ONLY' }
      )
    }

    // Téléphone : profil connecté, sinon saisie une seule fois (persistée sur le compte).
    if (payload.phone?.trim()) {
      await this.#clients.applyBookingIdentity(account.client, {
        phone: payload.phone.trim(),
      })
      await account.client.refresh()
      account.phone = payload.phone.trim()
      await account.save()
    }

    const clientPhone =
      (isPhoneComplete(account.client.phone) ? account.client.phone.trim() : null) ||
      (isPhoneComplete(account.phone) ? account.phone!.trim() : null) ||
      (payload.phone?.trim() || null)

    if (!clientPhone) {
      throw new Exception(
        'Indiquez votre numéro une seule fois : il sera enregistré sur votre profil.',
        { status: 422, code: 'E_PHONE_REQUIRED' }
      )
    }

    const clientName =
      account.client.fullName?.trim() || account.fullName?.trim() || account.email

    let interest = await MarketplaceInterest.query()
      .where('clientAccountId', account.id)
      .where('vehicleId', vehicle.id)
      .first()

    const isNew = !interest
    if (!interest) {
      interest = await MarketplaceInterest.create({
        clientAccountId: account.id,
        vehicleId: vehicle.id,
        agencyId: vehicle.agencyId,
        clientPhone,
        clientName,
        message: payload.message?.trim() || null,
        notifiedAt: null,
      })
    } else {
      interest.clientPhone = clientPhone
      interest.clientName = clientName
      if (payload.message?.trim()) interest.message = payload.message.trim()
      await interest.save()
    }

    if (isNew || !interest.notifiedAt) {
      const notified = await this.#notifications.notifyAgencyAdmins(vehicle.agencyId, {
        type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_INTEREST,
        title: 'Client intéressé (marketplace)',
        body: `${clientName} (${clientPhone}) est intéressé par ${vehicle.label}.`,
        href: '/admin/interests',
        meta: {
          interestId: interest.id,
          vehicleId: vehicle.id,
          clientAccountId: account.id,
          clientPhone,
          source: 'marketplace',
        },
      })
      if (notified.length > 0) {
        interest.notifiedAt = DateTime.now()
        await interest.save()
      }
    }

    const agencyPhone = await this.#agencyContactPhone(vehicle.agencyId)
    const vehicleUrl = `${webClientBase()}/vehicles/${vehicle.id}`
    const waText = [
      `Bonjour ${vehicle.agency?.name || 'l’agence'},`,
      `je suis intéressé(e) par ${vehicle.label} sur Mobiprofil.`,
      `Mon numéro : ${clientPhone}`,
      vehicleUrl,
    ].join('\n')

    return response.status(isNew ? 201 : 200).send({
      id: interest.id,
      vehicleId: interest.vehicleId,
      agencyId: interest.agencyId,
      created: isNew,
      alreadyInterested: !isNew,
      whatsappUrl: buildWhatsappUrl(agencyPhone, waText),
      agencyHasWhatsapp: Boolean(agencyPhone),
    })
  }
}
