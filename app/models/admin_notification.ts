import { AdminNotificationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class AdminNotification extends AdminNotificationSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
