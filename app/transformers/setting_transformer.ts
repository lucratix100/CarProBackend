import { BaseTransformer } from '@adonisjs/core/transformers'
import type Setting from '#models/setting'

export default class SettingTransformer extends BaseTransformer<Setting> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'companyName',
      'commissionPerDay',
      'tvaRate',
      'rentalConditions',
      'depositAmount',
      'createdAt',
      'updatedAt',
    ])
  }
}
