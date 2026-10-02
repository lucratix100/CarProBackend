import { ClientAccountSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Client from '#models/client'

export default class ClientAccount extends compose(ClientAccountSchema, withAuthFinder(hash)) {
  /** Tokens marketplace : table séparée (auth_access_tokens FK → users). */
  static accessTokens = DbAccessTokensProvider.forModel(ClientAccount, {
    table: 'client_auth_access_tokens',
    type: 'client_auth_token',
    prefix: 'oat_cli_',
  })
  declare currentAccessToken?: AccessToken

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  get canLogin() {
    return this.status === 'active'
  }
}
