import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'maintenances'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('cancelled_at').nullable()
      table.string('cancel_reason', 500).nullable()
      table
        .integer('cancelled_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.index(['vehicle_id', 'cancelled_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['vehicle_id', 'cancelled_at'])
      table.dropColumn('cancelled_at')
      table.dropColumn('cancel_reason')
      table.dropColumn('cancelled_by_user_id')
    })
  }
}
