import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('boost_status', 40).notNullable().defaultTo('none')
      table.date('boost_starts_at').nullable()
      table.date('boost_ends_at').nullable()
      table.timestamp('boost_submitted_at', { useTz: true }).nullable()
      table.timestamp('boost_reviewed_at', { useTz: true }).nullable()
      table
        .integer('boost_reviewed_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('boost_rejection_reason').nullable()
      table.index(['boost_status'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['boost_status'])
      table.dropForeign(['boost_reviewed_by_user_id'])
      table.dropColumn('boost_status')
      table.dropColumn('boost_starts_at')
      table.dropColumn('boost_ends_at')
      table.dropColumn('boost_submitted_at')
      table.dropColumn('boost_reviewed_at')
      table.dropColumn('boost_reviewed_by_user_id')
      table.dropColumn('boost_rejection_reason')
    })
  }
}
