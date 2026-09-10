import { OwnerNotificationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Owner from '#models/owner'

export default class OwnerNotification extends OwnerNotificationSchema {
  @belongsTo(() => Owner)
  declare owner: BelongsTo<typeof Owner>
}
