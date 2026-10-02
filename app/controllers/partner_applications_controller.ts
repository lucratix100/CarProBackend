import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import env from '#start/env'
import Agency from '#models/agency'
import ClientAccount from '#models/client_account'
import Owner from '#models/owner'
import PartnerApplication from '#models/partner_application'
import User from '#models/user'
import PartnerApplicationService from '#services/partner_application_service'
import {
  approveOwnerApplicationValidator,
  createPartnerApplicationValidator,
  listPartnerApplicationsValidator,
  rejectPartnerApplicationValidator,
} from '#validators/partner_application'

type ProAccess = {
  /** invited = email envoyé, ready = compte activé, revoked = bloqué */
  status: 'invited' | 'ready' | 'revoked' | null
  role: 'admin' | 'owner' | null
  /** URL de connexion back-office / portail */
  loginUrl: string | null
  homePath: string | null
  message: string | null
}

function proAppBaseUrl() {
  return env.get('FRONTEND_URL').replace(/\/$/, '')
}

function buildProAccess(user: User | null, roleHint: 'admin' | 'owner' | null): ProAccess {
  const base = proAppBaseUrl()
  if (!user || !roleHint) {
    return {
      status: null,
      role: roleHint,
      loginUrl: `${base}/login`,
      homePath: null,
      message: null,
    }
  }

  const homePath = roleHint === 'admin' ? '/admin' : '/portal'
  const loginUrl = `${base}/login`

  if (user.status === 'revoked') {
    return {
      status: 'revoked',
      role: roleHint,
      loginUrl,
      homePath,
      message: 'Ce compte pro a été désactivé. Contactez le support carPro.',
    }
  }

  if (user.status === 'active' && user.passwordSetAt) {
    return {
      status: 'ready',
      role: roleHint,
      loginUrl,
      homePath,
      message: 'Votre espace pro est actif. Connectez-vous avec le même email.',
    }
  }

  return {
    status: 'invited',
    role: roleHint,
    loginUrl,
    homePath,
    message:
      'Votre espace pro s’active par email. Ouvrez le lien d’invitation reçu (vérifiez aussi les indésirables).',
  }
}

async function resolveProUser(app: PartnerApplication): Promise<{
  user: User | null
  role: 'admin' | 'owner' | null
}> {
  if (app.status !== 'approved') {
    return { user: null, role: null }
  }

  if (app.type === 'owner' && app.createdOwnerId) {
    const owner = await Owner.query()
      .where('id', app.createdOwnerId)
      .preload('user')
      .first()
    return { user: owner?.user ?? null, role: 'owner' }
  }

  if (app.type === 'agency' && app.createdAgencyId) {
    const user = await User.query()
      .where('agencyId', app.createdAgencyId)
      .where('role', 'admin')
      .where('email', app.email.toLowerCase())
      .orderBy('id', 'desc')
      .first()
    return { user, role: 'admin' }
  }

  // Fallback: même email, rôle attendu
  const role = app.type === 'agency' ? 'admin' : 'owner'
  const user = await User.query()
    .where('email', app.email.toLowerCase())
    .where('role', role)
    .orderBy('id', 'desc')
    .first()
  return { user, role }
}

async function serializeApplication(app: PartnerApplication) {
  const { user, role } = await resolveProUser(app)
  const proAccess =
    app.status === 'approved' ? buildProAccess(user, role) : null

  return {
    id: app.id,
    type: app.type,
    status: app.status,
    fullName: app.fullName,
    email: app.email,
    phone: app.phone,
    cityId: app.cityId,
    agencyName: app.agencyName,
    requestedAgencyId: app.requestedAgencyId,
    fleetSize: app.fleetSize,
    message: app.message,
    rejectionReason: app.rejectionReason,
    reviewedAt: app.reviewedAt?.toISO() ?? null,
    createdAgencyId: app.createdAgencyId,
    createdOwnerId: app.createdOwnerId,
    createdAt: app.createdAt.toISO(),
    updatedAt: app.updatedAt?.toISO() ?? null,
    city: app.city
      ? { id: app.city.id, name: app.city.name, region: app.city.region }
      : null,
    requestedAgency: app.requestedAgency
      ? {
          id: app.requestedAgency.id,
          name: app.requestedAgency.name,
          slug: app.requestedAgency.slug,
        }
      : null,
    createdAgency: app.createdAgency
      ? {
          id: app.createdAgency.id,
          name: app.createdAgency.name,
          slug: app.createdAgency.slug,
        }
      : null,
    proAccess,
  }
}


export default class PartnerApplicationsController {
  #service = new PartnerApplicationService()

  #staffUser(auth: HttpContext['auth']) {
    return auth.use('api').getUserOrFail() as User
  }

  /**
   * Public list of active agencies for owner applications.
   */
  async agencies({ response }: HttpContext) {
    const agencies = await Agency.query()
      .where('isActive', true)
      .where('acceptOwnerApplications', true)
      .preload('city')
      .orderBy('name', 'asc')

    return response.ok({
      data: agencies.map((agency) => ({
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
        isVerified: agency.isVerified,
        city: agency.city
          ? { id: agency.city.id, name: agency.city.name, region: agency.city.region }
          : null,
      })),
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const account = auth.use('marketplace').getUserOrFail() as ClientAccount
    const payload = await request.validateUsing(createPartnerApplicationValidator)

    const application = await this.#service.create({
      type: payload.type,
      fullName: payload.fullName,
      email: account.email,
      phone: payload.phone,
      cityId: payload.cityId,
      agencyName: payload.agencyName,
      requestedAgencyId: payload.requestedAgencyId,
      fleetSize: payload.fleetSize,
      message: payload.message,
      clientAccountId: account.id,
    })

    await application.load('city')
    await application.load('requestedAgency')

    return response.created({
      data: await serializeApplication(application),
      message:
        'Demande envoyée. Après validation, votre espace pro s’activera par email d’invitation.',
    })
  }

  async mine({ auth, response }: HttpContext) {
    const account = auth.use('marketplace').getUserOrFail() as ClientAccount
    const email = account.email.toLowerCase()
    const rows = await PartnerApplication.query()
      .where((q) => {
        q.where('clientAccountId', account.id).orWhere('email', email)
      })
      .preload('city')
      .preload('requestedAgency')
      .preload('createdAgency')
      .orderBy('createdAt', 'desc')

    // Dédupliquer si match clientAccount + email
    const seen = new Set<number>()
    const unique = rows.filter((row) => {
      if (seen.has(row.id)) return false
      seen.add(row.id)
      return true
    })

    const blockReason = await this.#service.proAccountBlockReason(email, account.id)

    return response.ok({
      data: await Promise.all(unique.map((row) => serializeApplication(row))),
      block: { agency: blockReason, owner: blockReason },
    })
  }

  async index({ auth, request, response }: HttpContext) {
    const user = this.#staffUser(auth)
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      throw new Exception('Accès refusé.', { status: 403, code: 'E_FORBIDDEN' })
    }
    const filters = await request.validateUsing(listPartnerApplicationsValidator)
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = PartnerApplication.query()
      .preload('city')
      .preload('requestedAgency')
      .preload('createdAgency')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')

    if (user.role === 'admin') {
      if (!user.agencyId) {
        throw new Exception('Agence introuvable pour ce compte.', {
          status: 403,
          code: 'E_NO_AGENCY',
        })
      }
      query.where('type', 'owner').where('requestedAgencyId', user.agencyId)
    } else if (filters.type) {
      query.where('type', filters.type)
    }

    if (filters.status) query.where('status', filters.status)
    if (filters.agencyId && user.role === 'super_admin') {
      query.where('requestedAgencyId', filters.agencyId)
    }

    const paginated = await query.paginate(page, perPage)

    return response.ok({
      data: await Promise.all(paginated.all().map((row) => serializeApplication(row))),
      meta: paginated.getMeta(),
    })
  }

  async approve({ auth, params, request, response }: HttpContext) {
    const user = this.#staffUser(auth)
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      throw new Exception('Accès refusé.', { status: 403, code: 'E_FORBIDDEN' })
    }
    const application = await PartnerApplication.findOrFail(params.id)

    if (application.type === 'agency') {
      if (user.role !== 'super_admin') {
        throw new Exception('Seul le super-admin peut valider une candidature agence.', {
          status: 403,
          code: 'E_PARTNER_FORBIDDEN',
        })
      }
      const result = await this.#service.approveAgency(application, user)
      await result.application.load('city')
      await result.application.load('createdAgency')
      return response.ok({
        data: await serializeApplication(result.application),
        message:
          'Agence créée. Un email d’invitation a été envoyé : l’espace pro s’active via ce lien.',
      })
    }

    const payload = await request.validateUsing(approveOwnerApplicationValidator)
    const agencyId =
      user.role === 'admin' ? (user.agencyId ?? undefined) : payload.agencyId
    const result = await this.#service.approveOwner(application, user, {
      agencyId,
      sendInvitation: payload.sendInvitation,
    })
    await result.application.load('city')
    await result.application.load('requestedAgency')
    return response.ok({
      data: await serializeApplication(result.application),
      message:
        'Propriétaire créé. Un email d’invitation active l’espace pro (si l’envoi est activé).',
    })
  }

  async reject({ auth, params, request, response }: HttpContext) {
    const user = this.#staffUser(auth)
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      throw new Exception('Accès refusé.', { status: 403, code: 'E_FORBIDDEN' })
    }
    const payload = await request.validateUsing(rejectPartnerApplicationValidator)
    const application = await PartnerApplication.findOrFail(params.id)

    if (application.type === 'agency' && user.role !== 'super_admin') {
      throw new Exception('Seul le super-admin peut refuser une candidature agence.', {
        status: 403,
        code: 'E_PARTNER_FORBIDDEN',
      })
    }

    const updated = await this.#service.reject(application, user, payload.reason)
    await updated.load('city')
    await updated.load('requestedAgency')
    return response.ok({
      data: await serializeApplication(updated),
      message: 'Demande refusée.',
    })
  }
}
