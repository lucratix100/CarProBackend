import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Marque from '#models/marque'
import MarqueTransformer from '#transformers/marque_transformer'
import { createMarqueValidator } from '#validators/marque'

export default class MarquesController {
  /**
   * Liste des marques (avec modèles si ?with=modeles).
   */
  async index({ request, serialize }: HttpContext) {
    const withModeles = request.input('with') === 'modeles'
    const activeOnly = request.input('active') !== '0'

    const query = Marque.query().orderBy('name', 'asc')
    if (activeOnly) query.where('isActive', true)
    if (withModeles) {
      query.preload('modeles', (q) => {
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

  async show({ params, request, serialize }: HttpContext) {
    const activeOnly = request.input('active') !== '0'
    const marque = await Marque.query()
      .where('id', params.id)
      .preload('modeles', (q) => {
        if (activeOnly) q.where('isActive', true)
        q.orderBy('name', 'asc')
      })
      .firstOrFail()

    return serialize(MarqueTransformer.transform(marque).useVariant('withModeles'))
  }

  async store({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(createMarqueValidator)
    const existing = await Marque.query()
      .whereRaw('lower(name) = ?', [payload.name.toLowerCase()])
      .first()
    if (existing) {
      throw new Exception('Cette marque existe déjà.', { status: 422, code: 'E_MARQUE_TAKEN' })
    }

    const marque = await Marque.create({
      name: payload.name,
      isActive: payload.isActive ?? true,
    })

    return response.created(await serialize(MarqueTransformer.transform(marque)))
  }
}
