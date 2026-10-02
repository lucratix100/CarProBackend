import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Permission from '#models/permission'

export default class UserPermissionOverride extends BaseModel {
  static table = 'user_permission_overrides'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare permissionId: number

  @column()
  declare granted: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Permission)
  declare permission: BelongsTo<typeof Permission>
}
