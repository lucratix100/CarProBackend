import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import Agency from '#models/agency'
import City from '#models/city'
import User from '#models/user'
import Vehicle from '#models/vehicle'
import Client from '#models/client'
import Owner from '#models/owner'
import Rental from '#models/rental'
import Invoice from '#models/invoice'
import VehicleExpense from '#models/vehicle_expense'
import Setting from '#models/setting'
import AdminInvitationService from '#services/admin_invitation_service'
import { slugifyAgencyName } from '#services/agency_context'
import AgencyTransformer from '#transformers/agency_transformer'
import UserTransformer from '#transformers/user_transformer'
import AgencyLogoUploadService, {
  agencyLogoStatus,
} from '#services/agency_logo_upload_service'
import {
  createAgencyValidator,
  deleteAgencyValidator,
  inviteAgencyAdminValidator,
  rejectAgencyLogoValidator,
  updateAgencyValidator,
} from '#validators/agency'

type AgencyUsageCounts = {
  admins: number
  owners: number
  vehicles: number
  clients: number
  rentals: number
  invoices: number
  expenses: number
}

async function countTotal(query: { count: Function }) {
  const rows = await query.count('* as total')
  return Number(rows[0]?.$extras?.total ?? 0)
}

export default class AgenciesController {
  #logos = new AgencyLogoUploadService()

  #brandingPayload(agency: Agency, settings: Setting) {
    return {
      canUseCustomLogo: Boolean(agency.canUseCustomLogo),
      logoStatus: agencyLogoStatus(settings),
      logoUrl: settings.logoPath ? `/agencies/${agency.id}/logo` : null,
      pendingLogoUrl: settings.logoPendingPath
        ? `/agencies/${agency.id}/logo/pending`
        : null,
      logoRejectionReason: settings.logoRejectionReason,
    }
  }

  async #usageCounts(agencyId: number): Promise<AgencyUsageCounts> {
    const [admins, owners, vehicles, clients, rentals, invoices, expenses] = await Promise.all([
      countTotal(User.query().where('agencyId', agencyId).where('role', 'admin')),
      countTotal(Owner.query().where('agencyId', agencyId)),
      countTotal(Vehicle.query().where('agencyId', agencyId)),
      countTotal(Client.query().where('agencyId', agencyId)),
      countTotal(Rental.query().where('agencyId', agencyId)),
      countTotal(Invoice.query().where('agencyId', agencyId)),
      countTotal(VehicleExpense.query().where('agencyId', agencyId)),
    ])
    return { admins, owners, vehicles, clients, rentals, invoices, expenses }
  }

  #hasBusinessData(counts: AgencyUsageCounts) {
    return (
      counts.vehicles > 0 ||
      counts.clients > 0 ||
      counts.owners > 0 ||
      counts.rentals > 0 ||
      counts.invoices > 0 ||
      counts.expenses > 0
    )
  }

  #confirmationMatches(agency: Agency, confirmation: string) {
    const normalized = confirmation.trim().toLowerCase().replace(/^\//, '')
    return (
      normalized === agency.name.trim().toLowerCase() ||
      normalized === agency.slug.trim().toLowerCase()
    )
  }

  /**
   * List all agencies (super admin).
   */
  async index({ serialize }: HttpContext) {
    const agencies = await Agency.query().preload('city').orderBy('id', 'desc')
    const withCounts = await Promise.all(
      agencies.map(async (agency) => {
        const counts = await this.#usageCounts(agency.id)
        const base = await serialize(AgencyTransformer.transform(agency))
        const data = (base as { data?: Record<string, unknown> }).data ?? base
        return {
          ...data,
          counts: {
            admins: counts.admins,
            owners: counts.owners,
            vehicles: counts.vehicles,
            clients: counts.clients,
          },
        }
      })
    )
    return withCounts
  }

  /**
   * Create agency + first admin invitation + default settings.
   * Tout est atomique : si le gérant échoue, l’agence n’est pas créée.
   */
  async store({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(createAgencyValidator)
    const baseSlug = payload.slug || slugifyAgencyName(payload.name) || 'agence'
    let slug = baseSlug
    let n = 1
    while (await Agency.findBy('slug', slug)) {
      slug = `${baseSlug}-${n++}`
    }

    const city = await City.findOrFail(payload.cityId)
    const invitation = new AdminInvitationService()

    let agency: Agency
    let user: User
    let activationUrl: string

    try {
      ;({ agency, user, activationUrl } = await db.transaction(async (trx) => {
        const created = await Agency.create(
          {
            name: payload.name,
            slug,
            isActive: true,
            isVerified: false,
            notes: payload.notes ?? null,
            cityId: city.id,
            publishOnMarketplace: false,
          },
          { client: trx }
        )

        await Setting.create(
          {
            agencyId: created.id,
            companyName: payload.name,
            commissionPerDay: 10000,
            tvaRate: '0.18',
          },
          { client: trx }
        )

        const invited = await invitation.invite(
          {
            agencyId: created.id,
            fullName: payload.adminFullName,
            email: payload.adminEmail,
            phone: payload.adminPhone,
          },
          { trx, sendEmail: false }
        )

        return {
          agency: created,
          user: invited.user,
          activationUrl: invited.activationUrl,
        }
      }))
    } catch (error) {
      logger.error({ err: error }, '[agencies] Échec création agence + gérant')
      throw new Exception(
        'Impossible de créer l’agence. Vérifiez les informations ou réessayez plus tard.',
        { status: 422, code: 'E_AGENCY_CREATE' }
      )
    }

    await invitation.dispatchInvitationEmail(user, agency, activationUrl)

    return response.created(
      await serialize({
        agency: AgencyTransformer.transform(agency),
        admin: UserTransformer.transform(user),
        message:
          'Agence créée. Un email d’invitation a été envoyé au gérant (vérifier aussi les indésirables).',
      })
    )
  }

  async show({ params, serialize }: HttpContext) {
    const agency = await Agency.query().where('id', params.id).preload('city').firstOrFail()
    const [admins, settings, counts] = await Promise.all([
      User.query().where('agencyId', agency.id).where('role', 'admin').orderBy('id', 'desc'),
      Setting.current(agency.id),
      this.#usageCounts(agency.id),
    ])

    return serialize({
      agency: AgencyTransformer.transform(agency),
      admins: UserTransformer.transform(admins),
      branding: this.#brandingPayload(agency, settings),
      counts: {
        admins: counts.admins,
        owners: counts.owners,
        vehicles: counts.vehicles,
        clients: counts.clients,
        rentals: counts.rentals,
        invoices: counts.invoices,
        expenses: counts.expenses,
      },
    })
  }

  /**
   * Hard-delete an empty agency (no business data).
   * Confirmation must match the agency name or slug.
   */
  async destroy({ params, request, response }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    const payload = await request.validateUsing(deleteAgencyValidator)

    if (!this.#confirmationMatches(agency, payload.confirmation)) {
      throw new Exception(
        'Confirmation incorrecte. Saisissez le nom ou le slug exact de l’agence.',
        { status: 422, code: 'E_AGENCY_DELETE_CONFIRM' }
      )
    }

    const counts = await this.#usageCounts(agency.id)
    if (this.#hasBusinessData(counts)) {
      throw new Exception(
        'Impossible de supprimer une agence qui contient encore des données (véhicules, clients, propriétaires, locations ou factures). Désactivez-la plutôt.',
        { status: 422, code: 'E_AGENCY_NOT_EMPTY' }
      )
    }

    const settings = await Setting.query().where('agencyId', agency.id).first()
    const logoPaths = [settings?.logoPath, settings?.logoPendingPath].filter(
      (path): path is string => Boolean(path)
    )

    await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('agencyId', agency.id).delete()
      await Setting.query({ client: trx }).where('agencyId', agency.id).delete()
      agency.useTransaction(trx)
      await agency.delete()
    })

    await Promise.all(logoPaths.map((path) => this.#logos.removeIfExists(path)))

    return response.ok({ message: 'Agence supprimée définitivement.' })
  }

  async update({ params, request, serialize }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    const payload = await request.validateUsing(updateAgencyValidator)

    agency.merge({
      name: payload.name ?? agency.name,
      notes: payload.notes === undefined ? agency.notes : payload.notes,
      isActive: payload.isActive === undefined ? agency.isActive : payload.isActive,
      isVerified: payload.isVerified === undefined ? agency.isVerified : payload.isVerified,
      canUseCustomLogo:
        payload.canUseCustomLogo === undefined
          ? agency.canUseCustomLogo
          : payload.canUseCustomLogo,
      cityId: payload.cityId === undefined ? agency.cityId : payload.cityId,
      publishOnMarketplace:
        payload.publishOnMarketplace === undefined
          ? agency.publishOnMarketplace
          : payload.publishOnMarketplace,
    })

    if (payload.clearMarketplacePublishBan) {
      agency.marketplacePublishBannedUntil = null
      agency.marketplaceRejectionStreak = 0
    }

    await agency.save()
    await agency.load('city')

    return serialize(AgencyTransformer.transform(agency))
  }

  async approveLogo({ params, serialize }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    if (!agency.canUseCustomLogo) {
      throw new Exception('Activez d’abord le logo personnalisé pour cette agence.', {
        status: 422,
        code: 'E_AGENCY_LOGO_DISABLED',
      })
    }

    const settings = await Setting.current(agency.id)
    if (!settings.logoPendingPath) {
      throw new Exception('Aucun logo en attente de validation.', {
        status: 422,
        code: 'E_AGENCY_LOGO_NO_PENDING',
      })
    }

    const previousApproved = settings.logoPath
    const pending = settings.logoPendingPath
    settings.logoPath = pending
    settings.logoPendingPath = null
    settings.logoRejectionReason = null
    await settings.save()

    if (previousApproved && previousApproved !== pending) {
      await this.#logos.removeIfExists(previousApproved)
    }

    return serialize({
      agency: AgencyTransformer.transform(agency),
      branding: this.#brandingPayload(agency, settings),
      message: 'Logo approuvé.',
    })
  }

  async rejectLogo({ params, request, serialize }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    const payload = await request.validateUsing(rejectAgencyLogoValidator)
    const settings = await Setting.current(agency.id)

    if (!settings.logoPendingPath) {
      throw new Exception('Aucun logo en attente de validation.', {
        status: 422,
        code: 'E_AGENCY_LOGO_NO_PENDING',
      })
    }

    await this.#logos.removeIfExists(settings.logoPendingPath)
    settings.logoPendingPath = null
    settings.logoRejectionReason =
      payload.reason?.trim() || 'Logo refusé. Merci de soumettre un autre fichier.'
    await settings.save()

    return serialize({
      agency: AgencyTransformer.transform(agency),
      branding: this.#brandingPayload(agency, settings),
      message: 'Logo refusé.',
    })
  }

  async logoFile({ params, response }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    const settings = await Setting.current(agency.id)
    if (!settings.logoPath) {
      throw new Exception('Aucun logo approuvé.', { status: 404, code: 'E_AGENCY_LOGO' })
    }
    return this.#logos.streamFile(response, settings.logoPath)
  }

  async pendingLogoFile({ params, response }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    const settings = await Setting.current(agency.id)
    if (!settings.logoPendingPath) {
      throw new Exception('Aucun logo en attente.', {
        status: 404,
        code: 'E_AGENCY_LOGO_PENDING',
      })
    }
    return this.#logos.streamFile(response, settings.logoPendingPath)
  }

  /**
   * Invite an additional admin for an agency.
   */
  async inviteAdmin({ params, request, response, serialize }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    if (!agency.isActive) {
      throw new Exception('Impossible d’inviter un gérant sur une agence désactivée.', {
        status: 422,
        code: 'E_AGENCY_INACTIVE',
      })
    }

    const payload = await request.validateUsing(inviteAgencyAdminValidator)
    const invitation = new AdminInvitationService()
    try {
      const { user } = await invitation.invite({
        agencyId: agency.id,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
      })

      return response.created(
        await serialize({
          admin: UserTransformer.transform(user),
          message:
            'Invitation envoyée par email au gérant. Vérifiez aussi les indésirables.',
        })
      )
    } catch (error) {
      logger.error({ err: error }, '[agencies] Échec invitation gérant')
      throw new Exception(
        'Impossible d’inviter ce gérant. Vérifiez l’email ou réessayez plus tard.',
        { status: 422, code: 'E_AGENCY_ADMIN_INVITE' }
      )
    }
  }

  async resendAdminInvitation({ params, serialize }: HttpContext) {
    const agency = await Agency.findOrFail(params.agencyId ?? params.id)
    const user = await User.query()
      .where('id', params.adminId)
      .where('agencyId', agency.id)
      .where('role', 'admin')
      .firstOrFail()

    try {
      await new AdminInvitationService().resend(user)
      return serialize({
        admin: UserTransformer.transform(user),
        message: 'Invitation renvoyée par email.',
      })
    } catch (error) {
      throw new Exception((error as Error).message, { status: 422, code: 'E_INVITE_RESEND' })
    }
  }

  async revokeAdmin({ params, response }: HttpContext) {
    const agency = await Agency.findOrFail(params.agencyId ?? params.id)
    const user = await User.query()
      .where('id', params.adminId)
      .where('agencyId', agency.id)
      .where('role', 'admin')
      .firstOrFail()

    user.status = 'revoked'
    user.invitationToken = null
    await user.save()

    return response.ok({ message: 'Administrateur révoqué.' })
  }
}
