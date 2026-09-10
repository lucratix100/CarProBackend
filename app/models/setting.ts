import { SettingSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Agency from '#models/agency'

export default class Setting extends SettingSchema {
  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  static async current(agencyId: number) {
    let settings = await this.query().where('agencyId', agencyId).first()
    if (!settings) {
      settings = await this.create({
        agencyId,
        companyName: 'Profil Car Service',
        commissionPerDay: 10000,
        tvaRate: '0.18',
      })
    }
    return settings
  }
}
