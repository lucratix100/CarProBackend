import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicle_sales'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('agency_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table
        .integer('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('RESTRICT')
      table
        .integer('client_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('clients')
        .onDelete('RESTRICT')
      table
        .integer('client_account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('client_accounts')
        .onDelete('SET NULL')
      table.integer('offered_price').notNullable()
      table.integer('final_price').nullable()
      table.string('status', 40).notNullable().defaultTo('pending')
      table.text('notes').nullable()
      table.text('reject_reason').nullable()
      table.timestamp('accepted_at', { useTz: true }).nullable()
      table.timestamp('rejected_at', { useTz: true }).nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table.timestamp('sold_at', { useTz: true }).nullable()
      table
        .integer('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('updated_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['agency_id', 'status'])
      table.index(['vehicle_id', 'status'])
      table.index(['client_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
