import { BaseTransformer } from '@adonisjs/core/transformers'
import type VehicleComplianceDocument from '#models/vehicle_compliance_document'
import { isComplianceCostApplied, complianceSpentIso } from '#services/compliance_document_service'

export default class ComplianceDocumentTransformer extends BaseTransformer<VehicleComplianceDocument> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'vehicleId',
        'kind',
        'provider',
        'reference',
        'startsOn',
        'expiresOn',
        'cost',
        'chargedTo',
        'notes',
        'createdAt',
        'updatedAt',
      ]),
      spentOn: complianceSpentIso(this.resource),
      isApplied: isComplianceCostApplied(this.resource),
      isCurrent: Boolean(this.resource.$extras.isCurrent),
      vehicle: this.resource.vehicle
        ? {
            id: this.resource.vehicle.id,
            brand: this.resource.vehicle.brand,
            model: this.resource.vehicle.model,
            plate: this.resource.vehicle.plate,
            label: this.resource.vehicle.label,
            ownerId: this.resource.vehicle.ownerId,
          }
        : null,
    }
  }
}
