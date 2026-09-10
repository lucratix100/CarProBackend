import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import OwnerInvitationService from '#services/owner_invitation_service'
import AdminInvitationService from '#services/admin_invitation_service'
import { acceptInvitationValidator } from '#validators/user'
import { MANDATE_TERMS } from '#constants/mandate_terms'
import UserTransformer from '#transformers/user_transformer'
import User from '#models/user'

export default class InvitationsController {
  /**
   * Public: preview invitation (owner mandate terms or admin activation).
   */
  async show({ params, serialize }: HttpContext) {
    const ownerInvitation = new OwnerInvitationService()
    const ownerUser = await ownerInvitation.findValidInvitation(params.token)

    if (ownerUser) {
      return serialize({
        role: 'owner',
        email: ownerUser.email,
        fullName: ownerUser.fullName,
        expiresAt: ownerUser.invitationExpiresAt,
        terms: MANDATE_TERMS,
      })
    }

    const adminInvitation = new AdminInvitationService()
    const adminUser = await adminInvitation.findValidInvitation(params.token)

    if (!adminUser) {
      throw new Exception('Invitation invalide ou expirée.', {
        status: 404,
        code: 'E_INVALID_INVITATION',
      })
    }

    return serialize({
      role: 'admin',
      email: adminUser.email,
      fullName: adminUser.fullName,
      expiresAt: adminUser.invitationExpiresAt,
      terms: null,
      message: 'Définissez votre mot de passe pour activer votre compte administrateur d’agence.',
    })
  }

  /**
   * Public: accept invitation + set password → activate account.
   * Owners must accept mandate terms; admins skip terms.
   */
  async accept({ params, request, serialize, response }: HttpContext) {
    const payload = await request.validateUsing(acceptInvitationValidator)
    const { password, acceptTerms } = payload

    const ownerInvitation = new OwnerInvitationService()
    const ownerUser = await ownerInvitation.findValidInvitation(params.token)

    if (ownerUser) {
      if (acceptTerms !== true) {
        throw new Exception('Vous devez accepter les clauses du mandat.', {
          status: 422,
          code: 'E_TERMS_REQUIRED',
        })
      }

      try {
        const { user } = await ownerInvitation.acceptInvitation(
          params.token,
          password,
          request.ip()
        )

        const token = await User.accessTokens.create(user)
        await user.load('owner')
        if (user.agencyId) await user.load('agency')

        return response.ok(
          await serialize({
            message: 'Compte activé. Vous pouvez accéder à votre espace propriétaire.',
            user: UserTransformer.transform(user),
            token: token.value!.release(),
          })
        )
      } catch (error) {
        throw new Exception((error as Error).message, {
          status: 422,
          code: 'E_INVITATION_ACCEPT',
        })
      }
    }

    const adminInvitation = new AdminInvitationService()
    try {
      const { user } = await adminInvitation.acceptInvitation(params.token, password)
      const token = await User.accessTokens.create(user)
      if (user.agencyId) await user.load('agency')

      return response.ok(
        await serialize({
          message: 'Compte administrateur activé. Vous pouvez vous connecter.',
          user: UserTransformer.transform(user),
          token: token.value!.release(),
        })
      )
    } catch (error) {
      throw new Exception((error as Error).message, {
        status: 422,
        code: 'E_INVITATION_ACCEPT',
      })
    }
  }
}
