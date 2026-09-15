import hash from '@adonisjs/core/services/hash'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import PasswordResetService, { PASSWORD_RESET_HOURS } from '#services/password_reset_service'
import { changePasswordValidator } from '#validators/user'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    if (user.role === 'owner') {
      await user.load('owner')
    }
    if (user.agencyId) {
      await user.load('agency')
    }
    return serialize(UserTransformer.transform(user))
  }

  /**
   * Vérifie le mot de passe actuel puis envoie un lien de reset (24 h) par email.
   */
  async changePassword({ auth, request }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const { currentPassword } = await request.validateUsing(changePasswordValidator)

    const matches = await hash.verify(user.password, currentPassword)
    if (!matches) {
      throw new Exception('Mot de passe actuel incorrect.', {
        status: 422,
        code: 'E_INVALID_CURRENT_PASSWORD',
      })
    }

    const result = await new PasswordResetService().issueResetForUser(
      user,
      PASSWORD_RESET_HOURS
    )

    return result
  }
}
