import { BaseTransformer } from '@adonisjs/core/transformers'
import type Setting from '#models/setting'
import { agencyLogoStatus } from '#services/agency_logo_upload_service'
import { agencySignatureStatus } from '#services/agency_signature_upload_service'

export default class SettingTransformer extends BaseTransformer<Setting> {
  toObject() {
    const status = agencyLogoStatus(this.resource)
    const signatureStatus = agencySignatureStatus(this.resource)
    const canUseCustomLogo = Boolean(this.resource.agency?.canUseCustomLogo)
    const canUseCustomSignature = Boolean(this.resource.agency?.canUseCustomSignature)

    return {
      ...this.pick(this.resource, [
        'id',
        'companyName',
        'commissionPerDay',
        'tvaRate',
        'rentalConditions',
        'depositAmount',
        'documentHeaderColor',
        'logoRejectionReason',
        'signatureRejectionReason',
        'createdAt',
        'updatedAt',
      ]),
      canUseCustomLogo,
      canUseCustomSignature,
      logoStatus: status,
      logoUrl: this.resource.logoPath ? '/settings/logo' : null,
      pendingLogoUrl: this.resource.logoPendingPath ? '/settings/logo/pending' : null,
      signatureStatus,
      signatureUrl: this.resource.signaturePath ? '/settings/signature' : null,
      pendingSignatureUrl: this.resource.signaturePendingPath
        ? '/settings/signature/pending'
        : null,
    }
  }
}
