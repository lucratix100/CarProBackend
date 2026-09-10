import { BaseTransformer } from '@adonisjs/core/transformers'
import type Modele from '#models/modele'

export default class ModeleTransformer extends BaseTransformer<Modele> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'marqueId',
      'name',
      'isActive',
      'createdAt',
      'updatedAt',
    ])
  }

  withMarque() {
    return {
      ...this.toObject(),
      marque: this.resource.marque
        ? {
            id: this.resource.marque.id,
            name: this.resource.marque.name,
          }
        : null,
    }
  }
}
