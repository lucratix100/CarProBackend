import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Marque from '#models/marque'
import MarqueTransformer from '#transformers/marque_transformer'
import { createMarqueValidator } from '#validators/marque'
import { whereVisibleCatalog } from '#services/catalog_scope'

export default class MarquesController {
  /**
   * Liste des marques visibles : catalogue partagé + créations de l'agence.
   */
  async index({ request, serialize, agencyId }: HttpContext) {
    const withModeles = request.input('with') === 'modeles'
    const activeOnly = request.input('active') !== '0'

    const query = Marque.query().orderBy('name', 'asc')
    whereVisibleCatalog(query, agencyId!)
    if (activeOnly) query.where('isActive', true)
    if (withModeles) {
      query.preload('modeles', (q) => {
        whereVisibleCatalog(q, agencyId!)
        if (activeOnly) q.where('isActive', true)
        q.orderBy('name', 'asc')
      })
    }

    const marques = await query
    return serialize(
      withModeles
        ? MarqueTransformer.transform(marques).useVariant('withModeles')
        : MarqueTransformer.transform(marques)
    )
  }

  async show({ params, request, serialize, agencyId }: HttpContext) {
    const activeOnly = request.input('active') !== '0'
    const query = Marque.query().where('id', params.id)
    whereVisibleCatalog(query, agencyId!)
    const marque = await query
      .preload('modeles', (q) => {
        whereVisibleCatalog(q, agencyId!)
        if (activeOnly) q.where('isActive', true)
        q.orderBy('name', 'asc')
      })
      .firstOrFail()

    return serialize(MarqueTransformer.transform(marque).useVariant('withModeles'))
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createMarqueValidator)
    const existing = Marque.query().whereRaw('lower(name) = ?', [payload.name.toLowerCase()])
    whereVisibleCatalog(existing, agencyId!)
    if (await existing.first()) {
      throw new Exception('Cette marque existe déjà.', { status: 422, code: 'E_MARQUE_TAKEN' })
    }

    const marque = await Marque.create({
      name: payload.name,
      isActive: payload.isActive ?? true,
      agencyId: agencyId!,
    })

    return response.created(await serialize(MarqueTransformer.transform(marque)))
  }
}
