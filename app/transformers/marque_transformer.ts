import { BaseTransformer } from '@adonisjs/core/transformers'
import type Marque from '#models/marque'
import ModeleTransformer from '#transformers/modele_transformer'

export default class MarqueTransformer extends BaseTransformer<Marque> {
  toObject() {
    return this.pick(this.resource, ['id', 'name', 'isActive', 'createdAt', 'updatedAt'])
  }

  withModeles() {
    return {
      ...this.toObject(),
      modeles: (this.resource.modeles ?? []).map((modele) =>
        ModeleTransformer.transform(modele).toObject()
      ),
    }
  }
}
