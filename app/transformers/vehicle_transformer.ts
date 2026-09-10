import { BaseTransformer } from '@adonisjs/core/transformers'
import type Vehicle from '#models/vehicle'

export default class VehicleTransformer extends BaseTransformer<Vehicle> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'ownerId',
        'marqueId',
        'modeleId',
        'brand',
        'model',
        'plate',
        'year',
        'color',
        'fuel',
        'vehicleType',
        'status',
        'mileage',
        'dailyPrice',
        'insuranceCompany',
        'insuranceExpiresAt',
        'technicalVisitAt',
        'photoUrl',
        'notes',
        'createdAt',
        'updatedAt',
        'label',
        'complianceHold',
        'insuranceAlertStage',
        'technicalVisitAlertStage',
        'marketplacePublicationStatus',
        'marketplaceSubmittedAt',
        'marketplaceReviewedAt',
        'marketplaceReviewedByUserId',
        'marketplaceRejectionReason',
      ]),
      marque: this.resource.marque
        ? { id: this.resource.marque.id, name: this.resource.marque.name }
        : null,
      modele: this.resource.modele
        ? {
            id: this.resource.modele.id,
            name: this.resource.modele.name,
            marqueId: this.resource.modele.marqueId,
          }
        : null,
      owner: this.resource.owner
        ? {
            id: this.resource.owner.id,
            phone: this.resource.owner.phone,
            city: this.resource.owner.city,
            fullName: this.resource.owner.user?.fullName ?? null,
          }
        : null,
    }
  }

  /**
   * Owner portal: hide PCS commission context; expose net daily estimate via caller.
   */
  ownerView() {
    return this.pick(this.resource, [
      'id',
      'brand',
      'model',
      'plate',
      'year',
      'color',
      'fuel',
      'vehicleType',
      'status',
      'mileage',
      'dailyPrice',
      'insuranceCompany',
      'insuranceExpiresAt',
      'technicalVisitAt',
      'photoUrl',
      'label',
    ])
  }
}
