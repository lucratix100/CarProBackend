import { BaseTransformer } from '@adonisjs/core/transformers'
import type Setting from '#models/setting'
import { agencyLogoStatus } from '#services/agency_logo_upload_service'

export default class SettingTransformer extends BaseTransformer<Setting> {
  toObject() {
    const status = agencyLogoStatus(this.resource)
    const canUseCustomLogo = Boolean(this.resource.agency?.canUseCustomLogo)

    return {
      ...this.pick(this.resource, [
        'id',
        'companyName',
        'commissionPerDay',
        'tvaRate',
        'rentalConditions',
        'depositAmount',
        'logoRejectionReason',
        'createdAt',
        'updatedAt',
      ]),
      canUseCustomLogo,
      logoStatus: status,
      logoUrl: this.resource.logoPath ? '/settings/logo' : null,
      pendingLogoUrl: this.resource.logoPendingPath ? '/settings/logo/pending' : null,
    }
  }
}
