import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Permission from '#models/permission'

export default class StaffRole extends BaseModel {
  static table = 'staff_roles'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agencyId: number | null

  @column()
  declare slug: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare isSystem: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @manyToMany(() => Permission, {
    pivotTable: 'staff_role_permissions',
    localKey: 'id',
    pivotForeignKey: 'staff_role_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'permission_id',
  })
  declare permissions: ManyToMany<typeof Permission>
}
