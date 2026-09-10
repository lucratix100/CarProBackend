import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Vehicle from '#models/vehicle'
import Agency from '#models/agency'
import VehiclePhoto from '#models/vehicle_photo'
import MarketplaceReport from '#models/marketplace_report'
import Setting from '#models/setting'
import AdminNotificationService from '#services/admin_notification_service'
import MarketplacePublicationModerationService from '#services/marketplace_publication_moderation_service'
import VehiclePhotoUploadService, {
  VEHICLE_PHOTOS_MIN,
} from '#services/vehicle_photo_upload_service'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
import { MARKETPLACE_PUBLICATION_LABELS } from '#constants/marketplace_publication'
import {
  bulkApproveMarketplacePublicationsValidator,
  listMarketplacePublicationsValidator,
  rejectMarketplacePublicationValidator,
} from '#validators/marketplace_publication'

const REPORT_REASON_LABELS: Record<string, string> = {
  misleading: 'Annonce trompeuse',
  unavailable: 'Véhicule indisponible / déjà loué',
  pricing: 'Prix ou conditions incorrects',
  safety: 'Problème de sécurité',
  other: 'Autre',
}

export default class MarketplacePublicationsController {
  #notifications = new AdminNotificationService()
  #photos = new VehiclePhotoUploadService()
  #moderation = new MarketplacePublicationModerationService()

  async #serializeVehicle(vehicle: Vehicle, detailed = false) {
    const photos = await VehiclePhoto.query()
      .where('vehicleId', vehicle.id)
      .orderBy('position', 'asc')
      .orderBy('id', 'asc')

    const photoItems = photos.map((photo) => ({
      id: photo.id,
      position: photo.position,
      url: `/marketplace-publications/${vehicle.id}/photos/${photo.id}`,
    }))

    const openReportsCount = Number(
      (
        await MarketplaceReport.query()
          .where('vehicleId', vehicle.id)
          .where('status', 'open')
          .count('* as total')
      )[0]?.$extras?.total ?? 0
    )

    const base = {
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      plate: vehicle.plate,
      label: vehicle.label,
      fuel: vehicle.fuel,
      vehicleType: vehicle.vehicleType,
      year: vehicle.year,
      color: vehicle.color,
      status: vehicle.status,
      dailyPrice: vehicle.dailyPrice,
      complianceHold: vehicle.complianceHold,
      notes: vehicle.notes,
      marketplacePublicationStatus: vehicle.marketplacePublicationStatus,
      marketplaceSubmittedAt: vehicle.marketplaceSubmittedAt?.toISO?.() ?? null,
      marketplaceReviewedAt: vehicle.marketplaceReviewedAt?.toISO?.() ?? null,
      marketplaceRejectionReason: vehicle.marketplaceRejectionReason,
      marketplaceIsRereview: Boolean(vehicle.marketplaceIsRereview),
      photosCount: photoItems.length,
      photoUrl: photoItems[0]?.url ?? vehicle.photoUrl,
      openReportsCount,
      agency: vehicle.agency
        ? {
            id: vehicle.agency.id,
            name: vehicle.agency.name,
            slug: vehicle.agency.slug,
            isVerified: vehicle.agency.isVerified,
            publishOnMarketplace: vehicle.agency.publishOnMarketplace,
            marketplaceRejectionStreak: vehicle.agency.marketplaceRejectionStreak ?? 0,
            marketplacePublishBannedUntil:
              vehicle.agency.marketplacePublishBannedUntil?.toISO?.() ?? null,
            city: vehicle.agency.city
              ? {
                  id: vehicle.agency.city.id,
                  name: vehicle.agency.city.name,
                  region: vehicle.agency.city.region,
                }
              : null,
          }
        : null,
    }

    if (!detailed) return base

    const settings = vehicle.agencyId ? await Setting.current(vehicle.agencyId) : null
    const [history, reports] = await Promise.all([
      this.#moderation.historyForVehicle(vehicle.id),
      MarketplaceReport.query()
        .where('vehicleId', vehicle.id)
        .orderBy('createdAt', 'desc')
        .limit(20),
    ])

    return {
      ...base,
      depositAmount: settings?.depositAmount != null ? Number(settings.depositAmount) : null,
      rentalConditions: settings?.rentalConditions ?? null,
      mileage: vehicle.mileage,
      insuranceCompany: vehicle.insuranceCompany,
      insuranceExpiresAt: vehicle.insuranceExpiresAt?.toISODate?.() ?? null,
      technicalVisitAt: vehicle.technicalVisitAt?.toISODate?.() ?? null,
      insuranceAlertStage: vehicle.insuranceAlertStage,
      technicalVisitAlertStage: vehicle.technicalVisitAlertStage,
      photos: photoItems,
      history,
      reports: reports.map((report) => ({
        id: report.id,
        reason: report.reason,
        reasonLabel: REPORT_REASON_LABELS[report.reason] || report.reason,
        message: report.message,
        status: report.status,
        contactEmail: report.contactEmail,
        createdAt: report.createdAt.toISO(),
      })),
    }
  }

  async #approveOne(vehicle: Vehicle, reviewerId: number) {
    if (vehicle.marketplacePublicationStatus !== 'pending_review') {
      throw new Exception('Ce véhicule n’est pas en attente de validation.', {
        status: 422,
        code: 'E_NOT_PENDING_REVIEW',
      })
    }

    if (vehicle.complianceHold) {
      throw new Exception('Impossible d’approuver : documents / conformité en alerte.', {
        status: 422,
        code: 'E_COMPLIANCE_HOLD',
      })
    }

    const photosCount = await VehiclePhoto.query().where('vehicleId', vehicle.id).count('* as total')
    if (Number(photosCount[0]?.$extras?.total ?? 0) < VEHICLE_PHOTOS_MIN) {
      throw new Exception(`Au moins ${VEHICLE_PHOTOS_MIN} photos sont requises.`, {
        status: 422,
        code: 'E_PHOTOS_REQUIRED',
      })
    }

    vehicle.marketplacePublicationStatus = 'published'
    vehicle.marketplaceReviewedAt = DateTime.now()
    vehicle.marketplaceReviewedByUserId = reviewerId
    vehicle.marketplaceRejectionReason = null
    vehicle.marketplaceIsRereview = false
    await vehicle.save()

    await this.#moderation.logEvent({
      vehicle,
      action: 'approved',
      actorUserId: reviewerId,
    })
    await this.#moderation.onApproved(vehicle.agencyId)

    try {
      await this.#notifications.notifyAgencyAdmins(vehicle.agencyId, {
        type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_PUBLICATION_APPROVED,
        title: 'Annonce catalogue approuvée',
        body: `${vehicle.label} est maintenant visible sur carPro.`,
        href: `/admin/vehicles/${vehicle.id}`,
        meta: {
          vehicleId: vehicle.id,
          status: 'published',
        },
      })
    } catch {
      // ignore
    }
  }

  async index({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listMarketplacePublicationsValidator)
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const status = filters.status ?? 'pending_review'

    const query = Vehicle.query()
      .where('vehicles.marketplace_publication_status', status)
      .join('agencies', 'agencies.id', 'vehicles.agency_id')
      .select('vehicles.*')
      .preload('agency', (aq) => aq.preload('city'))
      .orderBy('agencies.is_verified', 'desc')
      .orderBy('vehicles.marketplace_is_rereview', 'desc')
      .orderBy('vehicles.marketplace_submitted_at', 'asc')
      .orderBy('vehicles.id', 'asc')

    if (filters.agencyId) {
      query.where('vehicles.agency_id', filters.agencyId)
    }

    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('vehicles.plate', q)
          .orWhereILike('vehicles.brand', q)
          .orWhereILike('vehicles.model', q)
          .orWhereILike('agencies.name', q)
      })
    }

    const paginated = await query.paginate(page, perPage)
    const rows = await Promise.all(paginated.all().map((v) => this.#serializeVehicle(v)))

    return response.ok({
      data: rows,
      meta: paginated.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .preload('agency', (aq) => aq.preload('city'))
      .firstOrFail()

    return response.ok(await this.#serializeVehicle(vehicle, true))
  }

  async history({ params, response }: HttpContext) {
    await Vehicle.findOrFail(params.id)
    return response.ok({
      data: await this.#moderation.historyForVehicle(params.id),
    })
  }

  async photoFile({ params, response }: HttpContext) {
    const vehicle = await Vehicle.findOrFail(params.id)
    const photo = await VehiclePhoto.query()
      .where('id', params.photoId)
      .where('vehicleId', vehicle.id)
      .firstOrFail()

    const absolutePath = this.#photos.absolutePath(photo.path)
    try {
      await access(absolutePath)
    } catch {
      throw new Exception('Fichier introuvable sur le serveur.', {
        status: 404,
        code: 'E_VEHICLE_PHOTO_MISSING',
      })
    }

    const ext = photo.path.split('.').pop()?.toLowerCase()
    const contentType =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

    response.header('Content-Type', contentType)
    response.header(
      'Content-Disposition',
      `inline; filename="vehicle-${vehicle.id}-${photo.id}.${ext}"`
    )
    return response.stream(createReadStream(absolutePath))
  }

  async approve({ params, auth, response }: HttpContext) {
    const reviewer = auth.use('api').getUserOrFail()
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .preload('agency')
      .firstOrFail()

    await this.#approveOne(vehicle, reviewer.id)
    await vehicle.load('agency', (aq) => aq.preload('city'))
    return response.ok({
      ...(await this.#serializeVehicle(vehicle)),
      message: 'Véhicule publié sur le catalogue.',
    })
  }

  async bulkApprove({ request, auth, response }: HttpContext) {
    const reviewer = auth.use('api').getUserOrFail()
    const payload = await request.validateUsing(bulkApproveMarketplacePublicationsValidator)

    const approved: number[] = []
    const failed: Array<{ id: number; message: string }> = []

    for (const id of payload.ids) {
      try {
        const vehicle = await Vehicle.query().where('id', id).preload('agency').firstOrFail()
        await this.#approveOne(vehicle, reviewer.id)
        approved.push(id)
      } catch (error) {
        failed.push({
          id,
          message: error instanceof Error ? error.message : 'Échec',
        })
      }
    }

    return response.ok({
      approved,
      failed,
      message:
        approved.length > 0
          ? `${approved.length} annonce${approved.length > 1 ? 's' : ''} approuvée${approved.length > 1 ? 's' : ''}.`
          : 'Aucune annonce approuvée.',
    })
  }

  async reject({ params, request, auth, response }: HttpContext) {
    const reviewer = auth.use('api').getUserOrFail()
    const payload = await request.validateUsing(rejectMarketplacePublicationValidator)
    const vehicle = await Vehicle.query().where('id', params.id).firstOrFail()

    if (vehicle.marketplacePublicationStatus !== 'pending_review') {
      throw new Exception('Ce véhicule n’est pas en attente de validation.', {
        status: 422,
        code: 'E_NOT_PENDING_REVIEW',
      })
    }

    const reason = payload.reason.trim()
    vehicle.marketplacePublicationStatus = 'rejected'
    vehicle.marketplaceReviewedAt = DateTime.now()
    vehicle.marketplaceReviewedByUserId = reviewer.id
    vehicle.marketplaceRejectionReason = reason
    vehicle.marketplaceIsRereview = false
    await vehicle.save()

    await this.#moderation.logEvent({
      vehicle,
      action: 'rejected',
      reason,
      actorUserId: reviewer.id,
    })
    await this.#moderation.onRejected(vehicle.agencyId)

    try {
      await this.#notifications.notifyAgencyAdmins(vehicle.agencyId, {
        type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_PUBLICATION_REJECTED,
        title: 'Annonce catalogue refusée',
        body: `${vehicle.label} — ${reason.slice(0, 140)}`,
        href: `/admin/vehicles/${vehicle.id}`,
        meta: {
          vehicleId: vehicle.id,
          status: 'rejected',
          reason,
        },
      })
    } catch {
      // ignore
    }

    await vehicle.load('agency', (aq) => aq.preload('city'))
    return response.ok({
      ...(await this.#serializeVehicle(vehicle)),
      message: 'Publication refusée. L’agence a été notifiée.',
    })
  }

  async unpublish({ params, auth, response }: HttpContext) {
    const reviewer = auth.use('api').getUserOrFail()
    const vehicle = await Vehicle.query().where('id', params.id).firstOrFail()

    if (vehicle.marketplacePublicationStatus !== 'published') {
      throw new Exception('Ce véhicule n’est pas publié.', {
        status: 422,
        code: 'E_NOT_PUBLISHED',
      })
    }

    vehicle.marketplacePublicationStatus = 'draft'
    vehicle.marketplaceReviewedAt = DateTime.now()
    vehicle.marketplaceReviewedByUserId = reviewer.id
    vehicle.marketplaceRejectionReason = null
    vehicle.marketplaceIsRereview = false
    await vehicle.save()

    await this.#moderation.logEvent({
      vehicle,
      action: 'unpublished',
      actorUserId: reviewer.id,
    })

    try {
      await this.#notifications.notifyAgencyAdmins(vehicle.agencyId, {
        type: ADMIN_NOTIFICATION_TYPES.MARKETPLACE_PUBLICATION_UNPUBLISHED,
        title: 'Annonce retirée du catalogue',
        body: `${vehicle.label} a été retiré du catalogue par carPro.`,
        href: `/admin/vehicles/${vehicle.id}`,
        meta: { vehicleId: vehicle.id, status: 'draft' },
      })
    } catch {
      // ignore
    }

    await vehicle.load('agency', (aq) => aq.preload('city'))
    return response.ok({
      ...(await this.#serializeVehicle(vehicle)),
      message: 'Véhicule retiré du catalogue.',
      label: MARKETPLACE_PUBLICATION_LABELS.draft,
    })
  }

  async agencies({ response }: HttpContext) {
    const agencies = await Agency.query()
      .where('isActive', true)
      .orderBy('name', 'asc')
      .select('id', 'name', 'slug')

    return response.ok({
      data: agencies.map((a) => ({ id: a.id, name: a.name, slug: a.slug })),
    })
  }
}
