import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import env from '#start/env'
import MarketplaceClientService from '#services/marketplace_client_service'
import Client from '#models/client'
import ClientAccount from '#models/client_account'
import { marketplaceProfileValidator, marketplaceSyncValidator } from '#validators/marketplace'

export default class MarketplaceAuthController {
  #clients = new MarketplaceClientService()

  #assertInternalKey(request: HttpContext['request']) {
    const expected = env.get('MARKETPLACE_SYNC_SECRET', '')
    const provided = request.header('x-marketplace-secret') || ''
    if (!expected || provided !== expected) {
      throw new Exception('Clé marketplace invalide.', {
        status: 401,
        code: 'E_MARKETPLACE_SECRET',
      })
    }
  }

  #sessionPayload(account: ClientAccount, client: Client | null, token?: string) {
    return {
      ...(token ? { token } : {}),
      account: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        phone: account.phone,
      },
      client: client
        ? {
            id: client.id,
            fullName: client.fullName,
            phone: client.phone,
            email: client.email,
            licenseNumber: client.licenseNumber,
            idCardNumber: client.idCardNumber,
            licenseExpiresAt: client.licenseExpiresAt?.toISODate?.() ?? null,
          }
        : null,
    }
  }

  /**
   * Sync Better Auth session → ClientAccount + token API.
   * Appelé uniquement depuis le BFF Next.js (secret partagé).
   */
  async sync({ request, response }: HttpContext) {
    this.#assertInternalKey(request)
    const payload = await request.validateUsing(marketplaceSyncValidator)
    const { account, client } = await this.#clients.upsertFromAuth(payload)

    if (!account.canLogin) {
      throw new Exception('Compte client désactivé.', {
        status: 403,
        code: 'E_ACCOUNT_INACTIVE',
      })
    }

    const token = await ClientAccount.accessTokens.create(account)

    return response.ok(this.#sessionPayload(account, client, token.value!.release()))
  }

  async me({ auth, response }: HttpContext) {
    const account = auth.use('marketplace').getUserOrFail() as ClientAccount
    await account.load('client')
    return response.ok(this.#sessionPayload(account, account.client))
  }

  async updateProfile({ auth, request, response }: HttpContext) {
    const account = auth.use('marketplace').getUserOrFail() as ClientAccount
    const payload = await request.validateUsing(marketplaceProfileValidator)
    const { account: updatedAccount, client } = await this.#clients.updateProfile(account, payload)
    return response.ok(this.#sessionPayload(updatedAccount, client))
  }

  async logout({ auth }: HttpContext) {
    const account = auth.use('marketplace').getUserOrFail() as ClientAccount
    if (account.currentAccessToken) {
      await ClientAccount.accessTokens.delete(account, account.currentAccessToken.identifier)
    }
    return { message: 'Déconnecté' }
  }
}
