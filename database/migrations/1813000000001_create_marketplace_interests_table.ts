import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'marketplace_interests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('client_account_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('client_accounts')
        .onDelete('CASCADE')
      table
        .integer('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('CASCADE')
      table
        .integer('agency_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table.string('client_phone', 40).nullable()
      table.string('client_name', 160).nullable()
      table.text('message').nullable()
      table.timestamp('notified_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['client_account_id', 'vehicle_id'])
      table.index(['agency_id', 'created_at'])
      table.index(['vehicle_id'])
      table.index(['client_account_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
