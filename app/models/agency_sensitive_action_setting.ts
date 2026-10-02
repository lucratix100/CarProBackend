import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { SensitiveActionMode } from '#constants/sensitive_actions'

export default class AgencySensitiveActionSetting extends BaseModel {
  static table = 'agency_sensitive_action_settings'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agencyId: number

  @column()
  declare actionCode: string

  @column()
  declare mode: SensitiveActionMode | string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
