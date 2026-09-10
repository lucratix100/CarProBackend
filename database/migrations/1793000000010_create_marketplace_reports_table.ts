import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'marketplace_reports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
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
      table
        .integer('client_account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('client_accounts')
        .onDelete('SET NULL')
      table
        .integer('rental_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('rentals')
        .onDelete('SET NULL')
      table
        .string('reason', 60)
        .notNullable()
        .comment('misleading|unavailable|pricing|safety|other')
      table.text('message').nullable()
      table.string('contact_email', 254).nullable()
      table.string('status', 40).notNullable().defaultTo('open')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['agency_id', 'status'])
      table.index(['vehicle_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
