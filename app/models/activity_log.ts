import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Agency from '#models/agency'
import Client from '#models/client'
import Rental from '#models/rental'
import Vehicle from '#models/vehicle'

export type ActivityResult =
  | 'success'
  | 'denied'
  | 'pending_validation'
  | 'approved'
  | 'rejected'

export default class ActivityLog extends BaseModel {
  static table = 'activity_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agencyId: number | null

  @column()
  declare actorUserId: number | null

  @column()
  declare actorName: string | null

  @column()
  declare actorEmail: string | null

  @column()
  declare action: string

  @column()
  declare module: string

  @column()
  declare entityType: string | null

  @column()
  declare entityId: number | null

  @column()
  declare clientId: number | null

  @column()
  declare rentalId: number | null

  @column()
  declare vehicleId: number | null

  @column({
    prepare: (value: Record<string, unknown> | null) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value) as Record<string, unknown>
      } catch {
        return null
      }
    },
  })
  declare oldValues: Record<string, unknown> | null

  @column({
    prepare: (value: Record<string, unknown> | null) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value) as Record<string, unknown>
      } catch {
        return null
      }
    },
  })
  declare newValues: Record<string, unknown> | null

  @column()
  declare summary: string | null

  @column()
  declare result: ActivityResult | string

  @column()
  declare validatedByUserId: number | null

  @column()
  declare validatedByName: string | null

  @column()
  declare ip: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'actorUserId' })
  declare actor: BelongsTo<typeof User>

  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Rental, { foreignKey: 'rentalId' })
  declare relatedRental: BelongsTo<typeof Rental>

  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
