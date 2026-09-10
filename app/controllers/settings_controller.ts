import type { HttpContext } from '@adonisjs/core/http'
import Setting from '#models/setting'
import SettingTransformer from '#transformers/setting_transformer'
import { updateSettingsValidator } from '#validators/setting'

export default class SettingsController {
  async show({ serialize, agencyId }: HttpContext) {
    const settings = await Setting.current(agencyId!)
    return serialize(SettingTransformer.transform(settings))
  }

  async update({ request, serialize, agencyId }: HttpContext) {
    const settings = await Setting.current(agencyId!)
    const payload = await request.validateUsing(updateSettingsValidator)

    settings.merge({
      companyName: payload.companyName ?? settings.companyName,
      commissionPerDay: payload.commissionPerDay ?? settings.commissionPerDay,
      tvaRate:
        payload.tvaRate === undefined ? settings.tvaRate : String(payload.tvaRate),
      rentalConditions:
        payload.rentalConditions === undefined
          ? settings.rentalConditions
          : payload.rentalConditions,
      depositAmount:
        payload.depositAmount === undefined ? settings.depositAmount : payload.depositAmount,
    })
    await settings.save()
    return serialize(SettingTransformer.transform(settings))
  }
}
