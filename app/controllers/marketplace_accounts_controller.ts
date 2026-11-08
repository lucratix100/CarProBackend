import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import ClientAccount from '#models/client_account'
import MarketplaceFavorite from '#models/marketplace_favorite'
import MarketplaceReport from '#models/marketplace_report'
import PartnerApplication from '#models/partner_application'
import Rental from '#models/rental'
import VehicleSale from '#models/vehicle_sale'
import {
  listMarketplaceAccountsValidator,
  updateMarketplaceAccountStatusValidator,
} from '#validators/marketplace_account'

function serializeAccount(account: ClientAccount) {
  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    phone: account.phone,
    status: account.status,
    clientId: account.clientId,
    hasGoogle: Boolean(account.googleId),
    createdAt: account.createdAt?.toISO() ?? null,
    updatedAt: account.updatedAt?.toISO() ?? null,
  }
}

export default class MarketplaceAccountsController {
  /**
   * Liste paginée des comptes marketplace — colonnes légères, sans N+1.
   */
  async index({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listMarketplaceAccountsValidator)
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = ClientAccount.query()
      .select(
        'id',
        'email',
        'fullName',
        'phone',
        'status',
        'clientId',
        'googleId',
        'createdAt',
        'updatedAt'
      )
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')

    if (filters.status) query.where('status', filters.status)

    if (filters.q?.trim()) {
      const like = `%${filters.q.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('email', like)
          .orWhereILike('fullName', like)
          .orWhereILike('phone', like)
      })
    }

    const paginated = await query.paginate(page, perPage)

    return response.ok({
      data: paginated.all().map(serializeAccount),
      meta: paginated.getMeta(),
    })
  }

  /**
   * Fiche + compteurs via COUNT parallèles (pas de chargement des lignes liées).
   */
  async show({ params, response }: HttpContext) {
    const account = await ClientAccount.query()
      .select(
        'id',
        'email',
        'fullName',
        'phone',
        'status',
        'clientId',
        'googleId',
        'betterAuthUserId',
        'createdAt',
        'updatedAt'
      )
      .where('id', params.id)
      .first()

    if (!account) {
      throw new Exception('Compte introuvable.', {
        status: 404,
        code: 'E_ACCOUNT_NOT_FOUND',
      })
    }

    await account.load('client', (q) => {
      q.select(
        'id',
        'fullName',
        'phone',
        'email',
        'licenseNumber',
        'idCardNumber',
        'licenseExpiresAt',
        'isActive',
        'createdAt'
      )
    })

    const clientId = account.clientId
    const [
      bookingsTotal,
      bookingsPending,
      favoritesCount,
      reportsCount,
      salesCount,
      applicationsCount,
    ] = await Promise.all([
      Rental.query().where('clientId', clientId).where('source', 'marketplace').count('* as total'),
      Rental.query()
        .where('clientId', clientId)
        .where('source', 'marketplace')
        .where('status', 'En attente')
        .count('* as total'),
      MarketplaceFavorite.query().where('clientAccountId', account.id).count('* as total'),
      MarketplaceReport.query().where('clientAccountId', account.id).count('* as total'),
      VehicleSale.query().where('clientAccountId', account.id).count('* as total'),
      PartnerApplication.query().where('clientAccountId', account.id).count('* as total'),
    ])

    const countOf = (rows: { $extras?: { total?: string | number } }[]) =>
      Number(rows[0]?.$extras?.total ?? 0)

    return response.ok({
      ...serializeAccount(account),
      betterAuthLinked: Boolean(account.betterAuthUserId),
      client: account.client
        ? {
            id: account.client.id,
            fullName: account.client.fullName,
            phone: account.client.phone,
            email: account.client.email,
            licenseNumber: account.client.licenseNumber,
            idCardNumber: account.client.idCardNumber,
            licenseExpiresAt: account.client.licenseExpiresAt?.toISODate?.() ?? null,
            isActive: account.client.isActive,
            createdAt: account.client.createdAt?.toISO() ?? null,
          }
        : null,
      stats: {
        bookingsTotal: countOf(bookingsTotal),
        bookingsPending: countOf(bookingsPending),
        favorites: countOf(favoritesCount),
        reports: countOf(reportsCount),
        sales: countOf(salesCount),
        partnerApplications: countOf(applicationsCount),
      },
    })
  }

  async updateStatus({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateMarketplaceAccountStatusValidator)
    const account = await ClientAccount.find(params.id)

    if (!account) {
      throw new Exception('Compte introuvable.', {
        status: 404,
        code: 'E_ACCOUNT_NOT_FOUND',
      })
    }

    if (account.status === payload.status) {
      return response.ok(serializeAccount(account))
    }

    account.status = payload.status
    await account.save()

    // Révoque les sessions API si suspension (évite un accès résiduel).
    if (payload.status === 'inactive') {
      await db.from('client_auth_access_tokens').where('tokenable_id', account.id).delete()
    }

    return response.ok(serializeAccount(account))
  }
}
