import type { HttpContext } from '@adonisjs/core/http'
import City from '#models/city'
import CityTransformer from '#transformers/city_transformer'

export default class CitiesController {
  async index({ serialize }: HttpContext) {
    const cities = await City.query().where('isActive', true).orderBy('region').orderBy('name')
    return serialize(CityTransformer.transform(cities))
  }
}
