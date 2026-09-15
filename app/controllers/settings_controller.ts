import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Agency from '#models/agency'
import Setting from '#models/setting'
import SettingTransformer from '#transformers/setting_transformer'
import AgencyLogoUploadService from '#services/agency_logo_upload_service'
import { updateSettingsValidator } from '#validators/setting'

export default class SettingsController {
  #logos = new AgencyLogoUploadService()

  async #loadSettings(agencyId: number) {
    const settings = await Setting.current(agencyId)
    await settings.load('agency')
    return settings
  }

  async show({ serialize, agencyId }: HttpContext) {
    const settings = await this.#loadSettings(agencyId!)
    return serialize(SettingTransformer.transform(settings))
  }

  async update({ request, serialize, agencyId }: HttpContext) {
    const settings = await this.#loadSettings(agencyId!)
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
        payload.depositAmount === undefined
          ? settings.depositAmount
          : payload.depositAmount === null
            ? null
            : String(payload.depositAmount),
    })
    await settings.save()
    await settings.load('agency')
    return serialize(SettingTransformer.transform(settings))
  }

  async uploadLogo({ request, response, serialize, agencyId }: HttpContext) {
    const agency = await Agency.findOrFail(agencyId!)
    if (!agency.canUseCustomLogo) {
      throw new Exception(
        'Le logo personnalisé n’est pas activé pour cette agence. Contactez carPro.',
        { status: 403, code: 'E_AGENCY_LOGO_DISABLED' }
      )
    }

    const file = this.#logos.validateFile(request.file('logo'))
    if (!file) {
      throw new Exception('Ajoutez un logo (JPG, PNG ou WEBP, max 500 Ko).', {
        status: 422,
        code: 'E_AGENCY_LOGO_REQUIRED',
      })
    }

    const settings = await this.#loadSettings(agencyId!)
    const previousPending = settings.logoPendingPath
    const path = await this.#logos.store(file, agencyId!)

    settings.logoPendingPath = path
    settings.logoRejectionReason = null
    await settings.save()

    if (previousPending && previousPending !== path) {
      await this.#logos.removeIfExists(previousPending)
    }

    await settings.load('agency')
    return response.ok(await serialize(SettingTransformer.transform(settings)))
  }

  async destroyLogo({ response, serialize, agencyId }: HttpContext) {
    const agency = await Agency.findOrFail(agencyId!)
    if (!agency.canUseCustomLogo) {
      throw new Exception('Le logo personnalisé n’est pas activé pour cette agence.', {
        status: 403,
        code: 'E_AGENCY_LOGO_DISABLED',
      })
    }

    const settings = await this.#loadSettings(agencyId!)

    if (settings.logoPendingPath) {
      await this.#logos.removeIfExists(settings.logoPendingPath)
      settings.logoPendingPath = null
    } else if (settings.logoPath) {
      await this.#logos.removeIfExists(settings.logoPath)
      settings.logoPath = null
      settings.logoRejectionReason = null
    }

    await settings.save()
    await settings.load('agency')
    return response.ok(await serialize(SettingTransformer.transform(settings)))
  }

  async logoFile({ response, agencyId }: HttpContext) {
    const settings = await Setting.current(agencyId!)
    if (!settings.logoPath) {
      throw new Exception('Aucun logo approuvé.', { status: 404, code: 'E_AGENCY_LOGO' })
    }
    return this.#logos.streamFile(response, settings.logoPath)
  }

  async pendingLogoFile({ response, agencyId }: HttpContext) {
    const settings = await Setting.current(agencyId!)
    if (!settings.logoPendingPath) {
      throw new Exception('Aucun logo en attente.', { status: 404, code: 'E_AGENCY_LOGO_PENDING' })
    }
    return this.#logos.streamFile(response, settings.logoPendingPath)
  }
}
