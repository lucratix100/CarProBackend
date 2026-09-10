import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Dépenses véhicule (achat, assurance, etc.) — distinctes des entretiens planifiés.
 * Le type « Achat » n’est autorisé que pour les voitures d’agence (owner_id null).
 */
export default class extends BaseSchema {
  protected tableName = 'vehicle_expenses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('agency_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table
        .integer('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('CASCADE')
      table.string('type', 40).notNullable()
      table.integer('amount').notNullable().defaultTo(0)
      table.date('spent_on').notNullable()
      table.string('provider', 160).nullable()
      table.text('notes').nullable()
      table.timestamp('cancelled_at').nullable()
      table.string('cancel_reason', 500).nullable()
      table
        .integer('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['agency_id'])
      table.index(['vehicle_id'])
      table.index(['spent_on'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
