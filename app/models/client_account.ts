import { ClientAccountSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Client from '#models/client'

export default class ClientAccount extends compose(ClientAccountSchema, withAuthFinder(hash)) {
  static accessTokens = DbAccessTokensProvider.forModel(ClientAccount)
  declare currentAccessToken?: AccessToken

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  get canLogin() {
    return this.status === 'active'
  }
}
