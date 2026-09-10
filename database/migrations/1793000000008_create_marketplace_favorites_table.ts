import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'marketplace_favorites'

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
      table.boolean('notify_available').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['client_account_id', 'vehicle_id'])
      table.index(['client_account_id'])
      table.index(['vehicle_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
