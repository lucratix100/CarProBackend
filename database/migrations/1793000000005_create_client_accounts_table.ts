import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'client_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('client_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('clients')
        .onDelete('CASCADE')
      table.string('email', 254).notNullable().unique()
      table.string('password', 255).nullable()
      table.string('full_name', 160).nullable()
      table.string('phone', 40).nullable()
      table.string('better_auth_user_id', 120).nullable().unique()
      table.string('google_id', 120).nullable().unique()
      table.string('status', 20).notNullable().defaultTo('active')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['client_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
