import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import PasswordResetService from '#services/password_reset_service'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/user'
import UserTransformer from '#transformers/user_transformer'
import User from '#models/user'

export default class PasswordResetsController {
  /**
   * Demande un lien de réinitialisation (réponse générique).
   */
  async store({ request }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)
    return new PasswordResetService().requestReset(email)
  }

  /**
   * Prévisualise un token de reset valide.
   */
  async show({ params, serialize }: HttpContext) {
    const user = await new PasswordResetService().findValidReset(params.token)
    if (!user) {
      throw new Exception('Lien de réinitialisation invalide ou expiré.', {
        status: 404,
        code: 'E_INVALID_PASSWORD_RESET',
      })
    }

    return serialize({
      email: user.email,
      fullName: user.fullName,
      expiresAt: user.passwordResetExpiresAt,
    })
  }

  /**
   * Définit le nouveau mot de passe puis connecte l’utilisateur.
   */
  async update({ params, request, serialize, response }: HttpContext) {
    const { password } = await request.validateUsing(resetPasswordValidator)
    const service = new PasswordResetService()

    try {
      const user = await service.resetPassword(params.token, password)
      const token = await User.accessTokens.create(user)

      if (user.role === 'owner') await user.load('owner')
      if (user.agencyId) await user.load('agency')

      return response.ok(
        await serialize({
          message: 'Mot de passe mis à jour. Vous êtes connecté.',
          user: UserTransformer.transform(user),
          token: token.value!.release(),
        })
      )
    } catch (error) {
      throw new Exception((error as Error).message, {
        status: 422,
        code: 'E_PASSWORD_RESET',
      })
    }
  }
}
