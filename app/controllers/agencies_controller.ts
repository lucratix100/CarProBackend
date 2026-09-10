import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import Agency from '#models/agency'
import City from '#models/city'
import User from '#models/user'
import Vehicle from '#models/vehicle'
import Client from '#models/client'
import Setting from '#models/setting'
import AdminInvitationService from '#services/admin_invitation_service'
import { slugifyAgencyName } from '#services/agency_context'
import AgencyTransformer from '#transformers/agency_transformer'
import UserTransformer from '#transformers/user_transformer'
import {
  createAgencyValidator,
  inviteAgencyAdminValidator,
  updateAgencyValidator,
} from '#validators/agency'

async function countTotal(query: { count: Function }) {
  const rows = await query.count('* as total')
  return Number(rows[0]?.$extras?.total ?? 0)
}

export default class AgenciesController {
  /**
   * List all agencies (super admin).
   */
  async index({ serialize }: HttpContext) {
    const agencies = await Agency.query().preload('city').orderBy('id', 'desc')
    const withCounts = await Promise.all(
      agencies.map(async (agency) => {
        const [admins, owners, vehicles, clients] = await Promise.all([
          countTotal(User.query().where('agencyId', agency.id).where('role', 'admin')),
          countTotal(User.query().where('agencyId', agency.id).where('role', 'owner')),
          countTotal(Vehicle.query().where('agencyId', agency.id)),
          countTotal(Client.query().where('agencyId', agency.id)),
        ])
        const base = await serialize(AgencyTransformer.transform(agency))
        const data = (base as { data?: Record<string, unknown> }).data ?? base
        return {
          ...data,
          counts: { admins, owners, vehicles, clients },
        }
      })
    )
    return withCounts
  }

  /**
   * Create agency + first admin invitation + default settings.
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

    const agency = await db.transaction(async (trx) => {
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

      return created
    })

    const invitation = new AdminInvitationService()
    const { user } = await invitation.invite({
      agencyId: agency.id,
      fullName: payload.adminFullName,
      email: payload.adminEmail,
    })

    return response.created(
      await serialize({
        agency: AgencyTransformer.transform(agency),
        admin: UserTransformer.transform(user),
        message:
          'Agence créée. Un email d’invitation a été envoyé (vérifier aussi les indésirables).',
      })
    )
  }

  async show({ params, serialize }: HttpContext) {
    const agency = await Agency.query().where('id', params.id).preload('city').firstOrFail()
    const admins = await User.query()
      .where('agencyId', agency.id)
      .where('role', 'admin')
      .orderBy('id', 'desc')

    return serialize({
      agency: AgencyTransformer.transform(agency),
      admins: UserTransformer.transform(admins),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    const payload = await request.validateUsing(updateAgencyValidator)

    agency.merge({
      name: payload.name ?? agency.name,
      notes: payload.notes === undefined ? agency.notes : payload.notes,
      isActive: payload.isActive === undefined ? agency.isActive : payload.isActive,
      isVerified: payload.isVerified === undefined ? agency.isVerified : payload.isVerified,
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

  /**
   * Invite an additional admin for an agency.
   */
  async inviteAdmin({ params, request, response, serialize }: HttpContext) {
    const agency = await Agency.findOrFail(params.id)
    if (!agency.isActive) {
      throw new Exception('Impossible d’inviter un admin sur une agence désactivée.', {
        status: 422,
        code: 'E_AGENCY_INACTIVE',
      })
    }

    const payload = await request.validateUsing(inviteAgencyAdminValidator)
    const invitation = new AdminInvitationService()
    const { user } = await invitation.invite({
      agencyId: agency.id,
      fullName: payload.fullName,
      email: payload.email,
    })

    return response.created(
      await serialize({
        admin: UserTransformer.transform(user),
        message:
          'Invitation envoyée par email à l’administrateur. Vérifiez aussi les indésirables.',
      })
    )
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
