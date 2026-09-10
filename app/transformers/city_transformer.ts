import { BaseTransformer } from '@adonisjs/core/transformers'
import type City from '#models/city'

export default class CityTransformer extends BaseTransformer<City> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'region',
      'slug',
      'isActive',
      'createdAt',
      'updatedAt',
    ])
  }
}
