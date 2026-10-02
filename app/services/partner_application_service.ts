import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Agency from '#models/agency'
import City from '#models/city'
import PartnerApplication from '#models/partner_application'
import Setting from '#models/setting'
import User from '#models/user'
import AdminInvitationService from '#services/admin_invitation_service'
import OwnerInvitationService from '#services/owner_invitation_service'
import AdminNotificationService from '#services/admin_notification_service'
import { ADMIN_NOTIFICATION_TYPES } from '#constants/admin_notification_types'
import {
  assertAgencyNameAvailable,
  assertAgencySlugAvailable,
  slugifyAgencyName,
} from '#services/agency_context'

export type CreatePartnerApplicationInput = {
  type: 'agency' | 'owner'
  fullName: string
  email: string
  phone: string
  cityId?: number | null
  agencyName?: string | null
  requestedAgencyId?: number | null
  fleetSize?: number | null
  message?: string | null
  clientAccountId?: number | null
}

export default class PartnerApplicationService {
  #adminInvites = new AdminInvitationService()
  #ownerInvites = new OwnerInvitationService()
  #notifications = new AdminNotificationService()

  async create(input: CreatePartnerApplicationInput) {
    const email = input.email.toLowerCase().trim()
    const type = input.type

    if (type === 'agency' && !input.agencyName?.trim()) {
      throw new Exception('Indiquez le nom de l’agence.', {
        status: 422,
        code: 'E_PARTNER_AGENCY_NAME',
      })
    }

    if (type === 'owner' && !input.requestedAgencyId) {
      throw new Exception('Choisissez l’agence avec laquelle vous souhaitez collaborer.', {
        status: 422,
        code: 'E_PARTNER_AGENCY_REQUIRED',
      })
    }

    if (input.cityId) {
      await City.findOrFail(input.cityId)
    }

    let requestedAgency: Agency | null = null
    if (input.requestedAgencyId) {
      requestedAgency = await Agency.query()
        .where('id', input.requestedAgencyId)
        .where('isActive', true)
        .first()
      if (!requestedAgency) {
        throw new Exception('Agence introuvable ou inactive.', {
          status: 422,
          code: 'E_PARTNER_AGENCY_INVALID',
        })
      }
      if (type === 'owner' && !requestedAgency.acceptOwnerApplications) {
        throw new Exception('Cette agence ne reçoit pas de candidatures propriétaires.', {
          status: 422,
          code: 'E_OWNER_APPLICATIONS_CLOSED',
        })
      }
    }

    const blockReason = await this.proAccountBlockReason(email, input.clientAccountId)
    if (blockReason) {
      throw new Exception(blockReason, { status: 409, code: 'E_PARTNER_BLOCKED' })
    }

    if (type === 'agency') {
      await assertAgencyNameAvailable(input.agencyName!.trim())
    }

    const application = await PartnerApplication.create({
      type,
      status: 'pending',
      clientAccountId: input.clientAccountId ?? null,
      fullName: input.fullName.trim(),
      email,
      phone: input.phone.trim(),
      cityId: input.cityId ?? null,
      agencyName: type === 'agency' ? input.agencyName!.trim() : null,
      requestedAgencyId: type === 'owner' ? requestedAgency!.id : null,
      fleetSize: input.fleetSize ?? null,
      message: input.message?.trim() || null,
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAgencyId: null,
      createdOwnerId: null,
    })

    if (type === 'owner' && requestedAgency) {
      try {
        await this.#notifications.notifyAgencyAdmins(requestedAgency.id, {
          type: ADMIN_NOTIFICATION_TYPES.PARTNER_OWNER_APPLICATION,
          title: 'Candidature propriétaire',
          body: `${application.fullName} souhaite confier un véhicule à votre agence.`,
          href: '/admin/owner-applications',
          meta: { applicationId: application.id },
        })
      } catch (error) {
        logger.warn({ err: error }, '[partner] notif admin owner application failed')
      }
    }

    return application
  }

  async approveAgency(application: PartnerApplication, reviewer: User) {
    if (application.type !== 'agency') {
      throw new Exception('Cette demande n’est pas une candidature agence.', {
        status: 422,
        code: 'E_PARTNER_WRONG_TYPE',
      })
    }
    this.#assertPending(application)

    if (!application.cityId) {
      throw new Exception('La candidature doit indiquer une ville avant validation.', {
        status: 422,
        code: 'E_PARTNER_CITY_REQUIRED',
      })
    }

    const city = await City.findOrFail(application.cityId)
    const agencyName = application.agencyName!.trim()
    const blockReason = await this.proAccountBlockReason(
      application.email,
      application.clientAccountId,
      application.id
    )
    if (blockReason) {
      throw new Exception(blockReason, { status: 409, code: 'E_PARTNER_BLOCKED' })
    }
    const nameKey = await assertAgencyNameAvailable(agencyName, {
      exceptApplicationId: application.id,
    })
    const slug = slugifyAgencyName(agencyName) || 'agence'
    await assertAgencySlugAvailable(slug)

    let agency: Agency
    let adminUser: User
    let activationUrl: string

    try {
      ;({ agency, adminUser, activationUrl } = await db.transaction(async (trx) => {
        const created = await Agency.create(
          {
            name: agencyName,
            nameKey,
            slug,
            isActive: true,
            isVerified: false,
            notes: application.message
              ? `Candidature #${application.id} — ${application.message}`
              : `Candidature marketplace #${application.id}`,
            cityId: city.id,
            publishOnMarketplace: false,
          },
          { client: trx }
        )

        await Setting.create(
          {
            agencyId: created.id,
            companyName: agencyName,
            commissionPerDay: 10000,
            tvaRate: '0.18',
          },
          { client: trx }
        )

        const invited = await this.#adminInvites.invite(
          {
            agencyId: created.id,
            fullName: application.fullName,
            email: application.email,
            phone: application.phone,
          },
          { trx, sendEmail: false }
        )

        application.useTransaction(trx)
        application.status = 'approved'
        application.reviewedByUserId = reviewer.id
        application.reviewedAt = DateTime.now()
        application.createdAgencyId = created.id
        application.rejectionReason = null
        await application.save()

        return {
          agency: created,
          adminUser: invited.user,
          activationUrl: invited.activationUrl,
        }
      }))
    } catch (error) {
      throw this.#approvalError(error, 'E_PARTNER_APPROVE_AGENCY', '[partner] approve agency failed')
    }

    await this.#adminInvites.dispatchInvitationEmail(adminUser, agency, activationUrl)
    return { application, agency, admin: adminUser }
  }

  async approveOwner(
    application: PartnerApplication,
    reviewer: User,
    options?: { agencyId?: number; sendInvitation?: boolean }
  ) {
    if (application.type !== 'owner') {
      throw new Exception('Cette demande n’est pas une candidature propriétaire.', {
        status: 422,
        code: 'E_PARTNER_WRONG_TYPE',
      })
    }
    this.#assertPending(application)

    const agencyId = options?.agencyId ?? application.requestedAgencyId
    if (!agencyId) {
      throw new Exception('Sélectionnez une agence pour rattacher le propriétaire.', {
        status: 422,
        code: 'E_PARTNER_AGENCY_REQUIRED',
      })
    }

    const agency = await Agency.query().where('id', agencyId).where('isActive', true).first()
    if (!agency) {
      throw new Exception('Agence introuvable ou inactive.', {
        status: 422,
        code: 'E_PARTNER_AGENCY_INVALID',
      })
    }

    if (reviewer.role === 'admin' && reviewer.agencyId !== agency.id) {
      throw new Exception('Vous ne pouvez valider que les candidatures de votre agence.', {
        status: 403,
        code: 'E_PARTNER_FORBIDDEN',
      })
    }

    const blockReason = await this.proAccountBlockReason(
      application.email,
      application.clientAccountId,
      application.id
    )
    if (blockReason) {
      throw new Exception(blockReason, { status: 409, code: 'E_PARTNER_BLOCKED' })
    }

    const sendInvitation = options?.sendInvitation !== false
    let cityName: string | null = null
    if (application.cityId) {
      const city = await City.find(application.cityId)
      cityName = city?.name ?? null
    }

    try {
      const { owner } = await this.#ownerInvites.create({
        agencyId: agency.id,
        fullName: application.fullName,
        email: application.email,
        phone: application.phone,
        city: cityName,
        notes: application.message
          ? `Candidature #${application.id} — ${application.message}`
          : `Candidature marketplace #${application.id}`,
        sendInvitation,
      })

      application.status = 'approved'
      application.reviewedByUserId = reviewer.id
      application.reviewedAt = DateTime.now()
      application.requestedAgencyId = agency.id
      application.createdOwnerId = owner.id
      application.rejectionReason = null
      await application.save()

      return { application, owner, agency }
    } catch (error) {
      throw this.#approvalError(error, 'E_PARTNER_APPROVE_OWNER', '[partner] approve owner failed')
    }
  }

  async reject(application: PartnerApplication, reviewer: User, reason?: string | null) {
    this.#assertPending(application)

    if (reviewer.role === 'admin') {
      if (application.type !== 'owner' || application.requestedAgencyId !== reviewer.agencyId) {
        throw new Exception('Vous ne pouvez refuser que les candidatures de votre agence.', {
          status: 403,
          code: 'E_PARTNER_FORBIDDEN',
        })
      }
    }

    application.status = 'rejected'
    application.reviewedByUserId = reviewer.id
    application.reviewedAt = DateTime.now()
    application.rejectionReason = reason?.trim() || null
    await application.save()
    return application
  }

  /**
   * Raison pour laquelle cet email ne peut plus déposer de candidature.
   * `ignoreApplicationId` sert à la validation : la demande en cours ne se bloque pas elle-même.
   */
  async proAccountBlockReason(
    email: string,
    clientAccountId?: number | null,
    ignoreApplicationId?: number
  ) {
    const normalized = email.toLowerCase().trim()
    const user = await User.query().where('email', normalized).first()
    if (user) {
      if (user.role === 'admin') {
        return 'Cet email gère déjà une agence. Vous ne pouvez pas déposer une autre demande.'
      }
      if (user.role === 'owner') {
        return 'Cet email est déjà un compte propriétaire. Vous ne pouvez pas devenir gérant ni déposer une autre demande.'
      }
      return 'Cet email est déjà utilisé par un compte pro.'
    }

    const open = await PartnerApplication.query()
      .whereIn('status', ['pending', 'approved'])
      .where((q) => {
        q.where('email', normalized)
        if (clientAccountId) q.orWhere('clientAccountId', clientAccountId)
      })
      .orderBy('id', 'desc')

    const relevant = open.filter((row) => row.id !== ignoreApplicationId)
    const pending = relevant.find((row) => row.status === 'pending')
    if (pending) {
      return pending.type === 'agency'
        ? 'Une demande d’agence est déjà en cours d’examen.'
        : 'Une demande propriétaire est déjà en cours d’examen.'
    }
    const approved = relevant.find((row) => row.status === 'approved')
    if (approved) {
      return approved.type === 'agency'
        ? 'Vous avez déjà une agence sur carPro.'
        : 'Vous avez déjà un compte propriétaire.'
    }
    return null
  }

  #approvalError(error: unknown, code: string, log: string): Exception {
    if (error instanceof Exception) return error
    const message = error instanceof Error ? error.message : ''
    if (/déjà utilisé/i.test(message)) {
      return new Exception(message, { status: 409, code: 'E_PARTNER_EMAIL_IN_USE' })
    }
    logger.error({ err: error }, log)
    return new Exception('Impossible de valider la candidature.', { status: 422, code })
  }

  #assertPending(application: PartnerApplication) {
    if (application.status !== 'pending') {
      throw new Exception('Cette demande a déjà été traitée.', {
        status: 409,
        code: 'E_PARTNER_ALREADY_REVIEWED',
      })
    }
  }
}
