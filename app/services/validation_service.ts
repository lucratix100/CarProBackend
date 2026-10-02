import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import AgencySensitiveActionSetting from '#models/agency_sensitive_action_setting'
import ValidationRequest from '#models/validation_request'
import User from '#models/user'
import Rental from '#models/rental'
import Client from '#models/client'
import Vehicle from '#models/vehicle'
import Payment from '#models/payment'
import RentalService from '#services/rental_service'
import InvoicePaymentService from '#services/invoice_payment_service'
import ClientLicenseUploadService from '#services/client_license_upload_service'
import VehiclePhotoUploadService from '#services/vehicle_photo_upload_service'
import AuditService from '#services/audit_service'
import AdminNotificationService from '#services/admin_notification_service'
import {
  SENSITIVE_ACTIONS,
  type SensitiveActionMode,
} from '#constants/sensitive_actions'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'

export type GateInput = {
  agencyId: number
  actor: User
  actionCode: string
  module: string
  entityType?: string | null
  entityId?: number | null
  clientId?: number | null
  rentalId?: number | null
  vehicleId?: number | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  payload?: Record<string, unknown> | null
  summary: string
  ip?: string | null
}

export type GateResult =
  | { outcome: 'proceed'; mode: SensitiveActionMode }
  | { outcome: 'pending'; mode: 'require_approval'; request: ValidationRequest }

export default class ValidationService {
  #audit = new AuditService()
  #notifications = new AdminNotificationService()

  async ensureAgencySettings(agencyId: number) {
    for (const def of SENSITIVE_ACTIONS) {
      const existing = await AgencySensitiveActionSetting.query()
        .where('agencyId', agencyId)
        .where('actionCode', def.code)
        .first()
      if (!existing) {
        await AgencySensitiveActionSetting.create({
          agencyId,
          actionCode: def.code,
          mode: def.defaultMode,
        })
      }
    }
  }

  async listSettings(agencyId: number) {
    await this.ensureAgencySettings(agencyId)
    const rows = await AgencySensitiveActionSetting.query().where('agencyId', agencyId)
    const byCode = new Map(rows.map((r) => [r.actionCode, r]))

    return SENSITIVE_ACTIONS.map((def) => {
      const row = byCode.get(def.code)
      return {
        code: def.code,
        module: def.module,
        label: def.label,
        description: def.description,
        defaultMode: def.defaultMode,
        mode: (row?.mode as SensitiveActionMode) ?? def.defaultMode,
      }
    })
  }

  async updateSettings(
    agencyId: number,
    updates: Array<{ actionCode: string; mode: SensitiveActionMode }>
  ) {
    await this.ensureAgencySettings(agencyId)
    const allowed = new Set(SENSITIVE_ACTIONS.map((a) => a.code))
    const modes = new Set(['free', 'notify', 'require_approval'])

    for (const item of updates) {
      if (!allowed.has(item.actionCode) || !modes.has(item.mode)) continue
      const row = await AgencySensitiveActionSetting.query()
        .where('agencyId', agencyId)
        .where('actionCode', item.actionCode)
        .firstOrFail()
      row.mode = item.mode
      await row.save()
    }

    return this.listSettings(agencyId)
  }

  async getMode(agencyId: number, actionCode: string): Promise<SensitiveActionMode> {
    await this.ensureAgencySettings(agencyId)
    const row = await AgencySensitiveActionSetting.query()
      .where('agencyId', agencyId)
      .where('actionCode', actionCode)
      .first()
    if (row) return row.mode as SensitiveActionMode
    const def = SENSITIVE_ACTIONS.find((a) => a.code === actionCode)
    return def?.defaultMode ?? 'free'
  }

  /**
   * Décide si l’action peut s’exécuter tout de suite.
   * Les gérants d’agence (role=admin) passent toujours (proceed).
   */
  async gate(input: GateInput): Promise<GateResult> {
    if (input.actor.role === 'admin' || input.actor.role === 'super_admin') {
      return { outcome: 'proceed', mode: 'free' }
    }

    const mode = await this.getMode(input.agencyId, input.actionCode)

    if (mode === 'free') {
      return { outcome: 'proceed', mode }
    }

    if (mode === 'notify') {
      return { outcome: 'proceed', mode }
    }

    // require_approval
    const request = await ValidationRequest.create({
      agencyId: input.agencyId,
      requesterUserId: input.actor.id,
      requesterName: input.actor.fullName ?? input.actor.email,
      actionCode: input.actionCode,
      module: input.module,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      clientId: input.clientId ?? null,
      rentalId: input.rentalId ?? null,
      vehicleId: input.vehicleId ?? null,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      payload: input.payload ?? null,
      summary: input.summary,
      status: 'pending',
    })

    await this.#audit.log({
      actor: input.actor,
      agencyId: input.agencyId,
      action: input.actionCode,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      clientId: input.clientId,
      rentalId: input.rentalId,
      vehicleId: input.vehicleId,
      oldValues: input.oldValues,
      newValues: input.newValues,
      summary: `${input.summary} — en attente de validation`,
      result: 'pending_validation',
      ip: input.ip,
    })

    try {
      await this.#notifications.notifyAgencyAdmins(input.agencyId, {
        type: ADMIN_NOTIFICATION_TYPES.VALIDATION_REQUEST,
        title: 'Demande de validation',
        body: `${input.actor.fullName ?? input.actor.email} : ${input.summary}`,
        href: '/admin/validations',
        meta: { validationRequestId: request.id, actionCode: input.actionCode },
      })
    } catch {
      // ignore
    }

    return { outcome: 'pending', mode: 'require_approval', request }
  }

  /** Après une action exécutée en mode notify. */
  async notifyAfterProceed(input: GateInput) {
    try {
      await this.#notifications.notifyAgencyAdmins(input.agencyId, {
        type: ADMIN_NOTIFICATION_TYPES.SENSITIVE_ACTION,
        title: 'Action sensible effectuée',
        body: `${input.actor.fullName ?? input.actor.email} : ${input.summary}`,
        href: '/admin/journal',
        meta: { actionCode: input.actionCode },
      })
    } catch {
      // ignore
    }
  }

  async listRequests(
    agencyId: number,
    filters: { status?: string; page?: number; perPage?: number } = {}
  ) {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const query = ValidationRequest.query()
      .where('agencyId', agencyId)
      .orderBy('id', 'desc')
    if (filters.status) query.where('status', filters.status)
    return query.paginate(page, perPage)
  }

  async approve(requestId: number, agencyId: number, reviewer: User, note?: string | null) {
    const request = await ValidationRequest.query()
      .where('id', requestId)
      .where('agencyId', agencyId)
      .firstOrFail()

    if (request.status !== 'pending') {
      throw new Exception('Cette demande a déjà été traitée.', {
        status: 422,
        code: 'E_ALREADY_REVIEWED',
      })
    }

    await this.#applyRequest(request)

    request.status = 'approved'
    request.reviewedByUserId = reviewer.id
    request.reviewedByName = reviewer.fullName ?? reviewer.email
    request.reviewNote = note?.trim() || null
    request.reviewedAt = DateTime.now()
    await request.save()

    await this.#audit.log({
      actor: request.requesterUserId
        ? await User.find(request.requesterUserId)
        : null,
      agencyId,
      action: request.actionCode,
      module: request.module,
      entityType: request.entityType,
      entityId: request.entityId,
      clientId: request.clientId,
      rentalId: request.rentalId,
      vehicleId: request.vehicleId,
      oldValues: request.oldValues,
      newValues: request.newValues,
      summary: request.summary,
      result: 'approved',
      validatedBy: reviewer,
    })

    if (request.requesterUserId) {
      try {
        await this.#notifications.notifyUser(request.requesterUserId, {
          type: ADMIN_NOTIFICATION_TYPES.VALIDATION_DECISION,
          title: 'Demande autorisée',
          body: `${request.summary} — autorisée par ${reviewer.fullName ?? reviewer.email}`,
          href: '/admin/validations',
          meta: { validationRequestId: request.id, status: 'approved' },
        })
      } catch {
        // ignore
      }
    }

    return request
  }

  async reject(requestId: number, agencyId: number, reviewer: User, note?: string | null) {
    const request = await ValidationRequest.query()
      .where('id', requestId)
      .where('agencyId', agencyId)
      .firstOrFail()

    if (request.status !== 'pending') {
      throw new Exception('Cette demande a déjà été traitée.', {
        status: 422,
        code: 'E_ALREADY_REVIEWED',
      })
    }

    request.status = 'rejected'
    request.reviewedByUserId = reviewer.id
    request.reviewedByName = reviewer.fullName ?? reviewer.email
    request.reviewNote = note?.trim() || null
    request.reviewedAt = DateTime.now()
    await request.save()

    await this.#audit.log({
      actor: request.requesterUserId
        ? await User.find(request.requesterUserId)
        : null,
      agencyId,
      action: request.actionCode,
      module: request.module,
      entityType: request.entityType,
      entityId: request.entityId,
      clientId: request.clientId,
      rentalId: request.rentalId,
      vehicleId: request.vehicleId,
      oldValues: request.oldValues,
      newValues: request.newValues,
      summary: `${request.summary} — refusé`,
      result: 'rejected',
      validatedBy: reviewer,
    })

    if (request.requesterUserId) {
      try {
        await this.#notifications.notifyUser(request.requesterUserId, {
          type: ADMIN_NOTIFICATION_TYPES.VALIDATION_DECISION,
          title: 'Demande refusée',
          body: `${request.summary} — refusée par ${reviewer.fullName ?? reviewer.email}`,
          href: '/admin/validations',
          meta: { validationRequestId: request.id, status: 'rejected' },
        })
      } catch {
        // ignore
      }
    }

    return request
  }

  async #applyRequest(request: ValidationRequest) {
    const payload = request.payload ?? {}

    switch (request.actionCode) {
      case 'rentals.update_price': {
        const rental = await Rental.query()
          .where('id', request.rentalId!)
          .where('agencyId', request.agencyId)
          .firstOrFail()
        const dailyPrice = Number(payload.dailyPrice)
        await new RentalService().update(rental, { dailyPrice })
        if (request.requesterUserId) {
          rental.updatedByUserId = request.requesterUserId
          await rental.save()
        }
        break
      }
      case 'rentals.cancel': {
        const rental = await Rental.query()
          .where('id', request.rentalId!)
          .where('agencyId', request.agencyId)
          .firstOrFail()
        await new RentalService().cancel(rental, {
          reason: typeof payload.reason === 'string' ? payload.reason : undefined,
          cancelledBy: 'agency',
        })
        if (request.requesterUserId) {
          rental.updatedByUserId = request.requesterUserId
          await rental.save()
        }
        break
      }
      case 'payments.cancel': {
        const paymentId = Number(payload.paymentId)
        const invoiceId = Number(payload.invoiceId)
        await Payment.query()
          .where('id', paymentId)
          .where('invoiceId', invoiceId)
          .firstOrFail()
        await new InvoicePaymentService().remove(paymentId)
        break
      }
      case 'clients.delete': {
        const client = await Client.query()
          .where('id', request.clientId!)
          .where('agencyId', request.agencyId)
          .firstOrFail()
        const uploads = new ClientLicenseUploadService()
        await uploads.removeIfExists(client.licenseRectoPath)
        await uploads.removeIfExists(client.licenseVersoPath)
        await client.delete()
        break
      }
      case 'vehicles.change_owner': {
        const vehicle = await Vehicle.query()
          .where('id', request.vehicleId!)
          .where('agencyId', request.agencyId)
          .firstOrFail()
        vehicle.ownerId =
          payload.ownerId === null || payload.ownerId === undefined
            ? null
            : Number(payload.ownerId)
        if (request.requesterUserId) vehicle.updatedByUserId = request.requesterUserId
        await vehicle.save()
        break
      }
      case 'vehicles.delete': {
        const vehicle = await Vehicle.query()
          .where('id', request.vehicleId!)
          .where('agencyId', request.agencyId)
          .preload('photos')
          .firstOrFail()
        const photos = new VehiclePhotoUploadService()
        for (const photo of vehicle.photos) {
          await photos.removeIfExists(photo.path)
        }
        await vehicle.delete()
        break
      }
      default:
        logger.warn({ action: request.actionCode }, '[validation] Action non applicable')
        throw new Exception('Action sensible non supportée à l’application.', {
          status: 422,
          code: 'E_UNSUPPORTED_SENSITIVE_ACTION',
        })
    }
  }

  serializeRequest(request: ValidationRequest) {
    return {
      id: request.id,
      agencyId: request.agencyId,
      requesterUserId: request.requesterUserId,
      requesterName: request.requesterName,
      actionCode: request.actionCode,
      module: request.module,
      entityType: request.entityType,
      entityId: request.entityId,
      clientId: request.clientId,
      rentalId: request.rentalId,
      vehicleId: request.vehicleId,
      oldValues: request.oldValues,
      newValues: request.newValues,
      summary: request.summary,
      status: request.status,
      reviewedByUserId: request.reviewedByUserId,
      reviewedByName: request.reviewedByName,
      reviewNote: request.reviewNote,
      reviewedAt: request.reviewedAt?.toISO?.() ?? request.reviewedAt,
      createdAt: request.createdAt?.toISO?.() ?? request.createdAt,
    }
  }
}

/** Helper pour les contrôleurs : réponse HTTP quand en attente. */
export function pendingValidationResponse(request: ValidationRequest) {
  return {
    pendingValidation: true,
    message: 'Cette modification nécessite l’autorisation de l’administrateur.',
    request: {
      id: request.id,
      actionCode: request.actionCode,
      summary: request.summary,
      status: request.status,
    },
  }
}
