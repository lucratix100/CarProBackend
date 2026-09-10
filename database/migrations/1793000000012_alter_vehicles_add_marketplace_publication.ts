import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('marketplace_publication_status', 40).notNullable().defaultTo('draft')
      table.timestamp('marketplace_submitted_at', { useTz: true }).nullable()
      table.timestamp('marketplace_reviewed_at', { useTz: true }).nullable()
      table
        .integer('marketplace_reviewed_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('marketplace_rejection_reason').nullable()
      table.index(['marketplace_publication_status'])
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .where('status', 'Disponible')
        .where('compliance_hold', false)
        .update({ marketplace_publication_status: 'published' })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['marketplace_publication_status'])
      table.dropForeign(['marketplace_reviewed_by_user_id'])
      table.dropColumn('marketplace_publication_status')
      table.dropColumn('marketplace_submitted_at')
      table.dropColumn('marketplace_reviewed_at')
      table.dropColumn('marketplace_reviewed_by_user_id')
      table.dropColumn('marketplace_rejection_reason')
    })
  }
}
