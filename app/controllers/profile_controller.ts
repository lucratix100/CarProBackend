import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

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
}
