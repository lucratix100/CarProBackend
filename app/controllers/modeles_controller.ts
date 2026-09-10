import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Modele from '#models/modele'
import Marque from '#models/marque'
import ModeleTransformer from '#transformers/modele_transformer'
import { createModeleValidator } from '#validators/marque'

export default class ModelesController {
  /**
   * Liste des modèles, filtrable par marqueId.
   */
  async index({ request, serialize }: HttpContext) {
    const marqueId = request.input('marqueId')
    const activeOnly = request.input('active') !== '0'

    const query = Modele.query().preload('marque').orderBy('name', 'asc')
    if (activeOnly) query.where('isActive', true)
    if (marqueId) query.where('marqueId', marqueId)

    const modeles = await query
    return serialize(ModeleTransformer.transform(modeles).useVariant('withMarque'))
  }

  async store({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(createModeleValidator)
    await Marque.findOrFail(payload.marqueId)

    const existing = await Modele.query()
      .where('marqueId', payload.marqueId)
      .whereRaw('lower(name) = ?', [payload.name.toLowerCase()])
      .first()
    if (existing) {
      throw new Exception('Ce modèle existe déjà pour cette marque.', {
        status: 422,
        code: 'E_MODELE_TAKEN',
      })
    }

    const modele = await Modele.create({
      marqueId: payload.marqueId,
      name: payload.name,
      isActive: payload.isActive ?? true,
    })
    await modele.load('marque')

    return response.created(
      await serialize(ModeleTransformer.transform(modele).useVariant('withMarque'))
    )
  }
}
