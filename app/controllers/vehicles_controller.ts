import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Vehicle from '#models/vehicle'
import VehiclePhoto from '#models/vehicle_photo'
import Owner from '#models/owner'
import Marque from '#models/marque'
import Modele from '#models/modele'
import Maintenance from '#models/maintenance'
import VehicleTransformer from '#transformers/vehicle_transformer'
import OwnerNotificationService from '#services/owner_notification_service'
import VehicleComplianceService from '#services/vehicle_compliance_service'
import VehicleSummaryService from '#services/vehicle_summary_service'
import VehiclePhotoUploadService, {
  VEHICLE_PHOTOS_MAX,
  VEHICLE_PHOTOS_MIN,
} from '#services/vehicle_photo_upload_service'
import Agency from '#models/agency'
import Setting from '#models/setting'
import MarketplacePublicationModerationService from '#services/marketplace_publication_moderation_service'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'
import { isExpenseApplied } from '#services/maintenance_expense_service'
import { createVehicleValidator, updateVehicleValidator } from '#validators/vehicle'

function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return DateTime.fromISO(value)
}

async function resolveMarqueModele(marqueId: number, modeleId: number) {
  const marque = await Marque.findOrFail(marqueId)
  const modele = await Modele.query()
    .where('id', modeleId)
    .where('marqueId', marqueId)
    .first()

  if (!modele) {
    throw new Exception('Ce modèle n’appartient pas à la marque sélectionnée.', {
      status: 422,
      code: 'E_MODELE_MARQUE_MISMATCH',
    })
  }

  return { marque, modele }
}

async function safeNotify(
  ownerId: number | null | undefined,
  payload: Parameters<OwnerNotificationService['notify']>[1]
) {
  if (!ownerId) return
  try {
    await new OwnerNotificationService().notify(ownerId, payload)
  } catch {
    // ignore notification failures
  }
}

export default class VehiclesController {
  #photos = new VehiclePhotoUploadService()
  #moderation = new MarketplacePublicationModerationService()

  async #requireRereviewIfPublished(vehicle: Vehicle) {
    if (vehicle.marketplacePublicationStatus !== 'published') return false
    vehicle.marketplacePublicationStatus = 'pending_review'
    vehicle.marketplaceSubmittedAt = DateTime.now()
    vehicle.marketplaceReviewedAt = null
    vehicle.marketplaceReviewedByUserId = null
    vehicle.marketplaceRejectionReason = null
    vehicle.marketplaceIsRereview = true
    await vehicle.save()
    await this.#moderation.logEvent({
      vehicle,
      action: 'rereview_requested',
    })
    return true
  }

  #photoPayload(vehicle: Vehicle) {
    const photos = (vehicle.photos ?? []).map((photo) => ({
      id: photo.id,
      position: photo.position,
      url: `/vehicles/${vehicle.id}/photos/${photo.id}`,
    }))
    return {
      photos,
      photosCount: photos.length,
      photoUrl: photos[0]?.url ?? vehicle.photoUrl ?? null,
    }
  }

  async #withPhotos(vehicle: Vehicle, serialize: HttpContext['serialize']) {
    const serialized = await serialize(VehicleTransformer.transform(vehicle))
    const base =
      serialized && typeof serialized === 'object' && 'data' in serialized
        ? (serialized as { data: Record<string, unknown> }).data
        : (serialized as Record<string, unknown>)
    return {
      ...base,
      ...this.#photoPayload(vehicle),
    }
  }

  async #loadVehicle(id: number | string, agencyId: number) {
    return Vehicle.query()
      .where('id', id)
      .where('agencyId', agencyId)
      .preload('owner', (ownerQuery) => ownerQuery.preload('user'))
      .preload('marque')
      .preload('modele')
      .preload('photos', (q) => q.orderBy('position', 'asc').orderBy('id', 'asc'))
      .firstOrFail()
  }

  async #syncCoverPhoto(vehicle: Vehicle) {
    await vehicle.load('photos', (q) => q.orderBy('position', 'asc').orderBy('id', 'asc'))
    const cover = vehicle.photos[0]
    vehicle.photoUrl = cover ? `/vehicles/${vehicle.id}/photos/${cover.id}` : null
    await vehicle.save()
  }

  async #assertOwnerInAgency(ownerId: number, agencyId: number) {
    const owner = await Owner.query().where('id', ownerId).where('agencyId', agencyId).first()
    if (!owner) {
      throw new Exception('Propriétaire introuvable pour cette agence.', {
        status: 422,
        code: 'E_OWNER_AGENCY',
      })
    }
    return owner
  }

  async index({ request, serialize, agencyId }: HttpContext) {
    const status = request.input('status')
    const ownerId = request.input('ownerId')
    const q = request.input('q')

    const query = Vehicle.query()
      .where('agencyId', agencyId!)
      .preload('owner', (ownerQuery) => ownerQuery.preload('user'))
      .preload('marque')
      .preload('modele')
      .preload('photos', (photoQuery) => photoQuery.orderBy('position', 'asc').orderBy('id', 'asc'))

    if (status) query.where('status', status)
    if (ownerId) query.where('ownerId', ownerId)
    if (q) {
      query.where((builder) => {
        builder
          .whereILike('brand', `%${q}%`)
          .orWhereILike('model', `%${q}%`)
          .orWhereILike('plate', `%${q}%`)
      })
    }

    const vehicles = await query.orderBy('id', 'desc')
    return Promise.all(vehicles.map((vehicle) => this.#withPhotos(vehicle, serialize)))
  }

  async store({ request, response, serialize, auth, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createVehicleValidator)
    const ownerId = payload.ownerId ?? null
    if (ownerId !== null) {
      await this.#assertOwnerInAgency(ownerId, agencyId!)
    }
    if (payload.purchasePrice !== undefined && payload.purchasePrice > 0 && ownerId !== null) {
      throw new Exception(
        'Le prix d’achat ne peut être renseigné que pour un véhicule appartenant à l’agence.',
        { status: 422, code: 'E_ACHAT_AGENCY_ONLY' }
      )
    }

    const { marque, modele } = await resolveMarqueModele(payload.marqueId, payload.modeleId)

    const existing = await Vehicle.query()
      .where('agencyId', agencyId!)
      .where('plate', payload.plate)
      .first()
    if (existing) {
      throw new Exception('Cette immatriculation existe déjà.', { status: 422, code: 'E_PLATE_TAKEN' })
    }

    const vehicle = await Vehicle.create({
      agencyId: agencyId!,
      ownerId,
      marqueId: marque.id,
      modeleId: modele.id,
      brand: marque.name,
      model: modele.name,
      plate: payload.plate,
      year: payload.year ?? null,
      color: payload.color ?? null,
      fuel: payload.fuel,
      vehicleType: payload.vehicleType,
      status: payload.status,
      mileage: payload.mileage ?? 0,
      dailyPrice: payload.dailyPrice,
      insuranceCompany: payload.insuranceCompany ?? null,
      insuranceExpiresAt: toDate(payload.insuranceExpiresAt) ?? null,
      technicalVisitAt: toDate(payload.technicalVisitAt) ?? null,
      photoUrl: payload.photoUrl ?? null,
      notes: payload.notes ?? null,
      insuranceAlertStage: null,
      technicalVisitAlertStage: null,
      complianceHold: false,
      marketplacePublicationStatus: 'draft',
      marketplaceSubmittedAt: null,
      marketplaceReviewedAt: null,
      marketplaceReviewedByUserId: null,
      marketplaceRejectionReason: null,
    })

    if (payload.purchasePrice !== undefined && payload.purchasePrice > 0) {
      const VehicleExpense = (await import('#models/vehicle_expense')).default
      const user = auth.use('api').getUserOrFail()
      await VehicleExpense.create({
        agencyId: agencyId!,
        vehicleId: vehicle.id,
        type: 'Achat',
        amount: payload.purchasePrice,
        spentOn: payload.purchaseDate
          ? DateTime.fromISO(payload.purchaseDate)
          : DateTime.now().startOf('day'),
        provider: null,
        notes: 'Prix d’acquisition',
        cancelledAt: null,
        cancelReason: null,
        createdByUserId: user.id,
      })
    }

    await vehicle.load('owner', (ownerQuery) => ownerQuery.preload('user'))
    await vehicle.load('marque')
    await vehicle.load('modele')
    await vehicle.load('photos', (q) => q.orderBy('position', 'asc'))

    try {
      await new VehicleComplianceService().syncVehicle(vehicle)
      await vehicle.refresh()
      await vehicle.load('owner', (ownerQuery) => ownerQuery.preload('user'))
      await vehicle.load('marque')
      await vehicle.load('modele')
      await vehicle.load('photos', (q) => q.orderBy('position', 'asc'))
    } catch {
      // ignore
    }

    await safeNotify(vehicle.ownerId, {
      type: OWNER_NOTIFICATION_TYPES.VEHICLE_ADDED,
      title: 'Véhicule ajouté à votre flotte',
      body: `${vehicle.label} (${vehicle.plate}) a été enregistré sous votre mandat.`,
      href: `/portal/vehicles/${vehicle.id}`,
      meta: { vehicleId: vehicle.id },
    })

    return response.created(await this.#withPhotos(vehicle, serialize))
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const vehicle = await this.#loadVehicle(params.id, agencyId!)
    return this.#withPhotos(vehicle, serialize)
  }

  async uploadPhotos({ params, request, response, serialize, agencyId }: HttpContext) {
    const vehicle = await this.#loadVehicle(params.id, agencyId!)
    const replace = ['1', 'true', true].includes(request.input('replace'))
    const files = request.files('photos')
    const validFiles = files
      .map((file, index) => this.#photos.validateFile(file, `Photo ${index + 1}`))
      .filter(Boolean)

    if (validFiles.length === 0) {
      throw new Exception('Ajoutez au moins une photo (JPG, PNG ou WEBP).', {
        status: 422,
        code: 'E_VEHICLE_PHOTOS_REQUIRED',
      })
    }

    const currentCount = vehicle.photos.length
    if (replace || currentCount === 0) {
      if (validFiles.length < VEHICLE_PHOTOS_MIN || validFiles.length > VEHICLE_PHOTOS_MAX) {
        throw new Exception(
          `Ajoutez entre ${VEHICLE_PHOTOS_MIN} et ${VEHICLE_PHOTOS_MAX} photos du véhicule.`,
          { status: 422, code: 'E_VEHICLE_PHOTOS_COUNT' }
        )
      }
    } else if (currentCount + validFiles.length > VEHICLE_PHOTOS_MAX) {
      throw new Exception(
        `Maximum ${VEHICLE_PHOTOS_MAX} photos. Il reste ${VEHICLE_PHOTOS_MAX - currentCount} emplacement(s).`,
        { status: 422, code: 'E_VEHICLE_PHOTOS_MAX' }
      )
    }

    if (replace || currentCount === 0) {
      for (const photo of vehicle.photos) {
        await this.#photos.removeIfExists(photo.path)
        await photo.delete()
      }
    }

    const startPosition =
      replace || currentCount === 0
        ? 0
        : Math.max(...vehicle.photos.map((p) => p.position), -1) + 1

    for (const [index, file] of validFiles.entries()) {
      const position = startPosition + index
      const path = await this.#photos.store(file!, vehicle.id, position)
      await VehiclePhoto.create({
        vehicleId: vehicle.id,
        path,
        position,
      })
    }

    await this.#syncCoverPhoto(vehicle)
    await this.#requireRereviewIfPublished(vehicle)
    const refreshed = await this.#loadVehicle(vehicle.id, agencyId!)
    return response.ok(await this.#withPhotos(refreshed, serialize))
  }

  async photoFile({ params, response, agencyId }: HttpContext) {
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .firstOrFail()

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

  async destroyPhoto({ params, response, serialize, agencyId }: HttpContext) {
    const vehicle = await this.#loadVehicle(params.id, agencyId!)
    const photo = vehicle.photos.find((p) => p.id === Number(params.photoId))
    if (!photo) {
      throw new Exception('Photo introuvable.', { status: 404, code: 'E_VEHICLE_PHOTO' })
    }

    if (vehicle.photos.length <= VEHICLE_PHOTOS_MIN) {
      throw new Exception(
        `Conservez au moins ${VEHICLE_PHOTOS_MIN} photos. Remplacez-les plutôt que de supprimer.`,
        { status: 422, code: 'E_VEHICLE_PHOTOS_MIN' }
      )
    }

    await this.#photos.removeIfExists(photo.path)
    await photo.delete()
    await this.#syncCoverPhoto(vehicle)
    await this.#requireRereviewIfPublished(vehicle)
    const refreshed = await this.#loadVehicle(vehicle.id, agencyId!)
    return response.ok(await this.#withPhotos(refreshed, serialize))
  }

  /**
   * Synthèse complète d’un véhicule (locations, dépenses, KPIs).
   */
  async summary({ params, serialize, agencyId }: HttpContext) {
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .preload('owner', (ownerQuery) => ownerQuery.preload('user'))
      .firstOrFail()

    const summary = await new VehicleSummaryService().build(vehicle, { ownerView: false })
    return serialize(summary)
  }

  /**
   * Toutes les dépenses d’entretien d’un véhicule (admin).
   */
  async expenses({ params, serialize, agencyId }: HttpContext) {
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .preload('owner', (ownerQuery) => ownerQuery.preload('user'))
      .firstOrFail()

    const rows = await Maintenance.query()
      .where('vehicleId', vehicle.id)
      .whereNull('cancelledAt')
      .orderBy('performedOn', 'desc')
      .orderBy('id', 'desc')

    let totalExpenses = 0
    const expenses = rows.map((row) => {
      const cost = Number(row.cost || 0)
      const applied = isExpenseApplied(row)
      if (applied) totalExpenses += cost
      return {
        maintenanceId: row.id,
        vehicleId: row.vehicleId,
        type: row.type,
        performedOn: row.performedOn,
        cost,
        mileage: row.mileage,
        provider: row.provider,
        nextDueOn: row.nextDueOn,
        description: row.description,
        isApplied: applied,
      }
    })

    return serialize({
      vehicle: {
        id: vehicle.id,
        label: vehicle.label,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        ownerId: vehicle.ownerId,
        ownerName: vehicle.owner?.user?.fullName ?? null,
      },
      totalExpenses,
      count: expenses.filter((e) => e.isApplied).length,
      expenses,
    })
  }

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .where('agencyId', agencyId!)
      .firstOrFail()
    const payload = await request.validateUsing(updateVehicleValidator)
    const previousOwnerId = vehicle.ownerId
    const previousStatus = vehicle.status
    const previousDailyPrice = vehicle.dailyPrice

    if (payload.ownerId !== undefined && payload.ownerId !== null) {
      await this.#assertOwnerInAgency(payload.ownerId, agencyId!)
    }

    if (payload.plate && payload.plate !== vehicle.plate) {
      const existing = await Vehicle.query()
        .where('agencyId', agencyId!)
        .where('plate', payload.plate)
        .whereNot('id', vehicle.id)
        .first()
      if (existing) {
        throw new Exception('Cette immatriculation existe déjà.', {
          status: 422,
          code: 'E_PLATE_TAKEN',
        })
      }
    }

    const nextMarqueId = payload.marqueId ?? vehicle.marqueId
    const nextModeleId = payload.modeleId ?? vehicle.modeleId

    if (
      (payload.marqueId !== undefined || payload.modeleId !== undefined) &&
      nextMarqueId &&
      nextModeleId
    ) {
      const { marque, modele } = await resolveMarqueModele(nextMarqueId, nextModeleId)
      vehicle.marqueId = marque.id
      vehicle.modeleId = modele.id
      vehicle.brand = marque.name
      vehicle.model = modele.name
    }

    vehicle.merge({
      ownerId: payload.ownerId === undefined ? vehicle.ownerId : payload.ownerId,
      plate: payload.plate ?? vehicle.plate,
      year: payload.year === undefined ? vehicle.year : payload.year,
      color: payload.color === undefined ? vehicle.color : payload.color,
      fuel: payload.fuel ?? vehicle.fuel,
      vehicleType: payload.vehicleType ?? vehicle.vehicleType,
      status: payload.status ?? vehicle.status,
      mileage: payload.mileage ?? vehicle.mileage,
      dailyPrice: payload.dailyPrice ?? vehicle.dailyPrice,
      insuranceCompany:
        payload.insuranceCompany === undefined
          ? vehicle.insuranceCompany
          : payload.insuranceCompany,
      photoUrl: payload.photoUrl === undefined ? vehicle.photoUrl : payload.photoUrl,
      notes: payload.notes === undefined ? vehicle.notes : payload.notes,
    })

    if (payload.insuranceExpiresAt !== undefined) {
      vehicle.insuranceExpiresAt = toDate(payload.insuranceExpiresAt) ?? null
    }
    if (payload.technicalVisitAt !== undefined) {
      vehicle.technicalVisitAt = toDate(payload.technicalVisitAt) ?? null
    }

    const sensitiveChanged =
      (payload.dailyPrice !== undefined && payload.dailyPrice !== previousDailyPrice) ||
      payload.plate !== undefined ||
      payload.fuel !== undefined ||
      payload.vehicleType !== undefined ||
      payload.color !== undefined ||
      payload.year !== undefined ||
      payload.notes !== undefined ||
      payload.marqueId !== undefined ||
      payload.modeleId !== undefined ||
      payload.photoUrl !== undefined

    await vehicle.save()

    if (sensitiveChanged) {
      await this.#requireRereviewIfPublished(vehicle)
    }
    await vehicle.load('owner', (ownerQuery) => ownerQuery.preload('user'))
    await vehicle.load('marque')
    await vehicle.load('modele')
    await vehicle.load('photos', (q) => q.orderBy('position', 'asc').orderBy('id', 'asc'))

    try {
      await new VehicleComplianceService().syncVehicle(vehicle)
      await vehicle.refresh()
      await vehicle.load('owner', (ownerQuery) => ownerQuery.preload('user'))
      await vehicle.load('marque')
      await vehicle.load('modele')
      await vehicle.load('photos', (q) => q.orderBy('position', 'asc').orderBy('id', 'asc'))
    } catch {
      // ne bloque pas la mise à jour
    }

    const label = vehicle.label
    if (vehicle.ownerId !== previousOwnerId) {
      await safeNotify(previousOwnerId, {
        type: OWNER_NOTIFICATION_TYPES.VEHICLE_REMOVED,
        title: 'Véhicule retiré de votre flotte',
        body: `${label} (${vehicle.plate}) n’est plus rattaché à votre mandat.`,
        href: '/portal/vehicles',
        meta: { vehicleId: vehicle.id },
      })
      await safeNotify(vehicle.ownerId, {
        type: OWNER_NOTIFICATION_TYPES.VEHICLE_ADDED,
        title: 'Véhicule ajouté à votre flotte',
        body: `${label} (${vehicle.plate}) a été rattaché à votre mandat.`,
        href: `/portal/vehicles/${vehicle.id}`,
        meta: { vehicleId: vehicle.id },
      })
    } else {
      if (payload.status !== undefined && vehicle.status !== previousStatus) {
        await safeNotify(vehicle.ownerId, {
          type: OWNER_NOTIFICATION_TYPES.VEHICLE_STATUS_CHANGED,
          title: 'Statut véhicule modifié',
          body: `${label} (${vehicle.plate}) : ${previousStatus} → ${vehicle.status}.`,
          href: `/portal/vehicles/${vehicle.id}`,
          meta: { vehicleId: vehicle.id, previousStatus, status: vehicle.status },
        })
      }
      if (payload.dailyPrice !== undefined && vehicle.dailyPrice !== previousDailyPrice) {
        await safeNotify(vehicle.ownerId, {
          type: OWNER_NOTIFICATION_TYPES.VEHICLE_PRICE_CHANGED,
          title: 'Tarif journalier modifié',
          body: `${label} (${vehicle.plate}) : tarif passé de ${previousDailyPrice} à ${vehicle.dailyPrice} FCFA/jour.`,
          href: `/portal/vehicles/${vehicle.id}`,
          meta: {
            vehicleId: vehicle.id,
            previousDailyPrice,
            dailyPrice: vehicle.dailyPrice,
          },
        })
      }
    }

    return this.#withPhotos(vehicle, serialize)
  }

  async submitMarketplace({ params, response, serialize, agencyId }: HttpContext) {
    const vehicle = await this.#loadVehicle(params.id, agencyId!)
    const agency = await Agency.findOrFail(agencyId!)

    if (!agency.publishOnMarketplace) {
      throw new Exception(
        'Votre agence n’est pas encore publiée sur le catalogue carPro. Contactez le support.',
        { status: 422, code: 'E_AGENCY_NOT_ON_MARKETPLACE' }
      )
    }

    if (this.#moderation.isPublishBanned(agency)) {
      const until = agency.marketplacePublishBannedUntil?.toFormat('dd/LL/yyyy HH:mm')
      throw new Exception(
        `Publication temporairement suspendue suite à trop de refus. Réessayez après le ${until}.`,
        { status: 422, code: 'E_PUBLISH_BANNED' }
      )
    }

    if (!['draft', 'rejected'].includes(vehicle.marketplacePublicationStatus)) {
      throw new Exception('Ce véhicule ne peut pas être soumis (déjà en revue ou publié).', {
        status: 422,
        code: 'E_INVALID_PUBLICATION_STATUS',
      })
    }

    if (vehicle.complianceHold) {
      throw new Exception(
        'Impossible de publier : documents (assurance / visite technique) en alerte.',
        { status: 422, code: 'E_COMPLIANCE_HOLD' }
      )
    }

    if (vehicle.photos.length < VEHICLE_PHOTOS_MIN) {
      throw new Exception(
        `Ajoutez au moins ${VEHICLE_PHOTOS_MIN} photos avant de demander la publication.`,
        { status: 422, code: 'E_PHOTOS_REQUIRED' }
      )
    }

    if (!vehicle.dailyPrice || Number(vehicle.dailyPrice) <= 0) {
      throw new Exception('Indiquez un prix journalier valide.', {
        status: 422,
        code: 'E_PRICE_REQUIRED',
      })
    }

    if (!vehicle.vehicleType) {
      throw new Exception('Indiquez le type de véhicule.', {
        status: 422,
        code: 'E_TYPE_REQUIRED',
      })
    }

    const settings = await Setting.current(agencyId!)
    if (settings.depositAmount == null || Number(settings.depositAmount) <= 0) {
      throw new Exception(
        'Renseignez une caution (montant > 0) dans Paramètres avant de demander la publication.',
        { status: 422, code: 'E_DEPOSIT_REQUIRED' }
      )
    }

    if (!settings.rentalConditions?.trim()) {
      throw new Exception(
        'Renseignez les conditions de location dans Paramètres avant de demander la publication.',
        { status: 422, code: 'E_CONDITIONS_REQUIRED' }
      )
    }

    vehicle.marketplacePublicationStatus = 'pending_review'
    vehicle.marketplaceSubmittedAt = DateTime.now()
    vehicle.marketplaceReviewedAt = null
    vehicle.marketplaceReviewedByUserId = null
    vehicle.marketplaceRejectionReason = null
    vehicle.marketplaceIsRereview = false
    await vehicle.save()

    await this.#moderation.logEvent({
      vehicle,
      action: 'submitted',
    })

    return response.ok({
      ...(await this.#withPhotos(vehicle, serialize)),
      message: 'Demande envoyée. carPro vérifiera l’annonce avant publication.',
    })
  }

  async unpublishMarketplace({ params, response, serialize, agencyId }: HttpContext) {
    const vehicle = await this.#loadVehicle(params.id, agencyId!)

    if (!['published', 'pending_review'].includes(vehicle.marketplacePublicationStatus)) {
      throw new Exception('Ce véhicule n’est pas publié ni en revue.', {
        status: 422,
        code: 'E_NOT_ON_MARKETPLACE',
      })
    }

    const wasPublished = vehicle.marketplacePublicationStatus === 'published'
    vehicle.marketplacePublicationStatus = 'draft'
    vehicle.marketplaceSubmittedAt = null
    vehicle.marketplaceReviewedAt = null
    vehicle.marketplaceReviewedByUserId = null
    vehicle.marketplaceRejectionReason = null
    vehicle.marketplaceIsRereview = false
    await vehicle.save()

    await this.#moderation.logEvent({
      vehicle,
      action: 'agency_unpublished',
    })

    return response.ok({
      ...(await this.#withPhotos(vehicle, serialize)),
      message: wasPublished
        ? 'Véhicule retiré du catalogue.'
        : 'Demande de publication annulée.',
    })
  }

  async destroy({ params, response, agencyId }: HttpContext) {
    const vehicle = await this.#loadVehicle(params.id, agencyId!)
    const ownerId = vehicle.ownerId
    const label = vehicle.label
    const plate = vehicle.plate
    const vehicleId = vehicle.id

    for (const photo of vehicle.photos) {
      await this.#photos.removeIfExists(photo.path)
    }

    await vehicle.delete()

    await safeNotify(ownerId, {
      type: OWNER_NOTIFICATION_TYPES.VEHICLE_REMOVED,
      title: 'Véhicule retiré de votre flotte',
      body: `${label} (${plate}) a été supprimé de la gestion PCS.`,
      href: '/portal/vehicles',
      meta: { vehicleId },
    })

    return response.ok({ message: 'Véhicule supprimé.' })
  }
}
