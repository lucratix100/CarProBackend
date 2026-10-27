import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Modele from '#models/modele'
import Marque from '#models/marque'
import ModeleTransformer from '#transformers/modele_transformer'
import { createModeleValidator } from '#validators/marque'
import { whereVisibleCatalog } from '#services/catalog_scope'

export default class ModelesController {
  /**
   * Liste des modèles visibles, filtrable par marqueId.
   */
  async index({ request, serialize, agencyId }: HttpContext) {
    const marqueId = request.input('marqueId')
    const activeOnly = request.input('active') !== '0'

    const query = Modele.query().preload('marque').orderBy('name', 'asc')
    whereVisibleCatalog(query, agencyId!)
    query.whereHas('marque', (marqueQuery) => {
      whereVisibleCatalog(marqueQuery, agencyId!)
    })
    if (activeOnly) query.where('isActive', true)
    if (marqueId) query.where('marqueId', marqueId)

    const modeles = await query
    return serialize(ModeleTransformer.transform(modeles).useVariant('withMarque'))
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createModeleValidator)
    const marqueQuery = Marque.query().where('id', payload.marqueId)
    whereVisibleCatalog(marqueQuery, agencyId!)
    await marqueQuery.firstOrFail()

    const existing = Modele.query()
      .where('marqueId', payload.marqueId)
      .whereRaw('lower(name) = ?', [payload.name.toLowerCase()])
    whereVisibleCatalog(existing, agencyId!)
    if (await existing.first()) {
      throw new Exception('Ce modèle existe déjà pour cette marque.', {
        status: 422,
        code: 'E_MODELE_TAKEN',
      })
    }

    const modele = await Modele.create({
      marqueId: payload.marqueId,
      name: payload.name,
      isActive: payload.isActive ?? true,
      agencyId: agencyId!,
    })
    await modele.load('marque')

    return response.created(
      await serialize(ModeleTransformer.transform(modele).useVariant('withMarque'))
    )
  }
}
