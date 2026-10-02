import User from '#models/user'
import Agency from '#models/agency'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import UserTransformer from '#transformers/user_transformer'
import AuditService from '#services/audit_service'

export default class AccessTokensController {
  #audit = new AuditService()

  async store({ request, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    let user: User
    try {
      user = await User.verifyCredentials(email.toLowerCase(), password)
    } catch {
      await this.#audit.log({
        action: 'auth.login_failed',
        module: 'auth',
        summary: `Échec de connexion pour ${email.toLowerCase()}`,
        result: 'denied',
        ip: request.ip(),
        newValues: { email: email.toLowerCase() },
      })
      throw new Exception('Identifiants invalides.', { status: 400, code: 'E_INVALID_CREDENTIALS' })
    }

    if (!user.canLogin) {
      const statusMessage =
        user.status === 'invited'
          ? 'Compte non activé. Acceptez les clauses via le lien d’invitation.'
          : user.status === 'blocked'
            ? 'Compte bloqué. Contactez l’administrateur de votre agence.'
            : user.status === 'suspended'
              ? 'Compte suspendu. Contactez l’administrateur de votre agence.'
              : 'Compte désactivé ou non autorisé.'
      await this.#audit.log({
        actor: user,
        agencyId: user.agencyId,
        action: 'auth.login_denied',
        module: 'auth',
        summary: statusMessage,
        result: 'denied',
        ip: request.ip(),
      })
      throw new Exception(statusMessage, { status: 403, code: 'E_ACCOUNT_INACTIVE' })
    }

    if (user.role === 'admin' || user.role === 'staff') {
      if (!user.agencyId) {
        throw new Exception('Aucune agence associée à ce compte.', {
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
      if (user.role === 'staff' && user.agency.staffPaused) {
        throw new Exception(
          'L’accès des collaborateurs est en pause. Contactez le gérant de votre agence.',
          { status: 403, code: 'E_STAFF_PAUSED' }
        )
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

    await this.#audit.log({
      actor: user,
      agencyId: user.agencyId,
      action: 'auth.login',
      module: 'auth',
      summary: `Connexion de ${user.fullName ?? user.email}`,
      ip: request.ip(),
    })

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }

  async destroy({ auth, request }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    await this.#audit.log({
      actor: user,
      agencyId: user.agencyId,
      action: 'auth.logout',
      module: 'auth',
      summary: `Déconnexion de ${user.fullName ?? user.email}`,
      ip: request.ip(),
    })

    return {
      message: 'Logged out successfully',
    }
  }
}
