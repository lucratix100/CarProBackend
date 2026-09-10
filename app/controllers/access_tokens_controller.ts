import User from '#models/user'
import Agency from '#models/agency'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import UserTransformer from '#transformers/user_transformer'

export default class AccessTokensController {
  async store({ request, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email.toLowerCase(), password)

    if (!user.canLogin) {
      throw new Exception(
        user.status === 'invited'
          ? 'Compte non activé. Acceptez les clauses via le lien d’invitation.'
          : 'Compte désactivé ou non autorisé.',
        { status: 403, code: 'E_ACCOUNT_INACTIVE' }
      )
    }

    if (user.role === 'admin') {
      if (!user.agencyId) {
        throw new Exception('Aucune agence associée à ce compte administrateur.', {
          status: 403,
          code: 'E_NO_AGENCY',
        })
      }
      await user.load('agency')
      if (!user.agency?.isActive) {
        throw new Exception('Cette agence est désactivée.', {
          status: 403,
          code: 'E_AGENCY_INACTIVE',
        })
      }
    }

    if (user.role === 'owner') {
      await user.load('owner')
      if (user.owner && !user.owner.isActive) {
        throw new Exception('Compte propriétaire désactivé.', {
          status: 403,
          code: 'E_OWNER_INACTIVE',
        })
      }

      const agencyId = user.agencyId ?? user.owner?.agencyId ?? null
      if (agencyId) {
        if (user.agencyId === agencyId) {
          await user.load('agency')
          if (!user.agency?.isActive) {
            throw new Exception('Cette agence est désactivée.', {
              status: 403,
              code: 'E_AGENCY_INACTIVE',
            })
          }
        } else {
          const agency = await Agency.find(agencyId)
          if (!agency?.isActive) {
            throw new Exception('Cette agence est désactivée.', {
              status: 403,
              code: 'E_AGENCY_INACTIVE',
            })
          }
        }
      }
    }

    // super_admin: no agency required

    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }

  async destroy({ auth }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    return {
      message: 'Logged out successfully',
    }
  }
}
