import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Agency from '#models/agency'

function jsonColumn() {
  return {
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
  }
}

export type ValidationRequestStatus = 'pending' | 'approved' | 'rejected'

export default class ValidationRequest extends BaseModel {
  static table = 'validation_requests'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agencyId: number

  @column()
  declare requesterUserId: number | null

  @column()
  declare requesterName: string | null

  @column()
  declare actionCode: string

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

  @column(jsonColumn())
  declare oldValues: Record<string, unknown> | null

  @column(jsonColumn())
  declare newValues: Record<string, unknown> | null

  @column(jsonColumn())
  declare payload: Record<string, unknown> | null

  @column()
  declare summary: string | null

  @column()
  declare status: ValidationRequestStatus | string

  @column()
  declare reviewedByUserId: number | null

  @column()
  declare reviewedByName: string | null

  @column()
  declare reviewNote: string | null

  @column.dateTime()
  declare reviewedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => User, { foreignKey: 'requesterUserId' })
  declare requester: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'reviewedByUserId' })
  declare reviewer: BelongsTo<typeof User>
}
