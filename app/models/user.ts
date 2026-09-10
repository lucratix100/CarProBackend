import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { belongsTo, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import Owner from '#models/owner'
import Agency from '#models/agency'

export type UserRole = 'super_admin' | 'admin' | 'owner'
export type UserStatus = 'invited' | 'active' | 'revoked'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @hasOne(() => Owner)
  declare owner: HasOne<typeof Owner>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }

  get isSuperAdmin() {
    return this.role === 'super_admin'
  }

  get isAdmin() {
    return this.role === 'admin'
  }

  get isOwner() {
    return this.role === 'owner'
  }

  get isActive() {
    return this.status === 'active'
  }

  get canLogin() {
    return this.status === 'active' && this.passwordSetAt !== null
  }
}
