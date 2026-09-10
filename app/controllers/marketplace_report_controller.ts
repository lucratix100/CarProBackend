import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import ClientAccount from '#models/client_account'
import MarketplaceReport from '#models/marketplace_report'
import Vehicle from '#models/vehicle'
import AdminNotificationService from '#services/admin_notification_service'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
import { marketplaceReportValidator } from '#validators/marketplace'
import { listMarketplaceReportsValidator } from '#validators/marketplace_publication'

const REASON_LABELS: Record<string, string> = {
  misleading: 'Annonce trompeuse',
  unavailable: 'Véhicule indisponible / déjà loué',
  pricing: 'Prix ou conditions incorrects',
  safety: 'Problème de sécurité',
  other: 'Autre',
}

export default class MarketplaceReportController {
  #notifications = new AdminNotificationService()

  async index({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listMarketplaceReportsValidator)
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = MarketplaceReport.query()
      .preload('vehicle')
      .preload('agency')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')

    if (filters.vehicleId) query.where('vehicleId', filters.vehicleId)
    if (filters.agencyId) query.where('agencyId', filters.agencyId)
    if (filters.status) query.where('status', filters.status)

    const paginated = await query.paginate(page, perPage)

    return response.ok({
      data: paginated.all().map((report) => ({
        id: report.id,
        reason: report.reason,
        reasonLabel: REASON_LABELS[report.reason] || report.reason,
        message: report.message,
        status: report.status,
        contactEmail: report.contactEmail,
        createdAt: report.createdAt.toISO(),
        vehicle: report.vehicle
          ? {
              id: report.vehicle.id,
              label: report.vehicle.label,
              plate: report.vehicle.plate,
            }
          : null,
        agency: report.agency
          ? {
              id: report.agency.id,
              name: report.agency.name,
              slug: report.agency.slug,
            }
          : null,
      })),
      meta: paginated.getMeta(),
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const payload = await request.validateUsing(marketplaceReportValidator)

    if (payload.reason === 'other' && (!payload.message || payload.message.trim().length < 10)) {
      throw new Exception('Précisez le problème (au moins 10 caractères).', {
        status: 422,
        code: 'E_REPORT_MESSAGE_REQUIRED',
      })
    }

    let account: ClientAccount | null = null
    const marketplaceAuth = auth.use('marketplace')
    if (await marketplaceAuth.check()) {
      account = marketplaceAuth.user as ClientAccount
    }

    const vehicle = await Vehicle.query()
      .where('id', payload.vehicleId)
      .whereHas('agency', (aq) => {
        aq.where('isActive', true).where('publishOnMarketplace', true)
      })
      .where('marketplacePublicationStatus', 'published')
      .preload('agency')
      .first()

    if (!vehicle) {
      throw new Exception('Véhicule introuvable sur le catalogue.', {
        status: 404,
        code: 'E_VEHICLE_MISSING',
      })
    }

    const report = await MarketplaceReport.create({
      vehicleId: vehicle.id,
      agencyId: vehicle.agencyId,
      clientAccountId: account?.id ?? null,
      rentalId: payload.rentalId ?? null,
      reason: payload.reason,
      message: payload.message ?? null,
      contactEmail: payload.contactEmail?.toLowerCase() || account?.email || null,
      status: 'open',
    })

    const reasonLabel = REASON_LABELS[payload.reason] || payload.reason
    try {
      await this.#notifications.notifyAgencyAdmins(vehicle.agencyId, {
        type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_REPORT,
        title: 'Signalement catalogue',
        body: `${vehicle.label} — ${reasonLabel}${payload.message ? ` : ${payload.message.slice(0, 120)}` : ''}`,
        href: `/admin/vehicles/${vehicle.id}`,
        meta: {
          reportId: report.id,
          vehicleId: vehicle.id,
          reason: payload.reason,
        },
      })
    } catch {
      // ne bloque pas le signalement
    }

    return response.created({
      id: report.id,
      status: report.status,
      message: 'Signalement envoyé. Merci, l’agence en a été informée.',
    })
  }
}
