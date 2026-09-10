import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('client_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('clients')
        .onDelete('RESTRICT')
      table
        .integer('rental_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('rentals')
        .onDelete('SET NULL')
      table.integer('amount_ht').notNullable().defaultTo(0)
      table.date('issued_on').notNullable()
      table.string('status', 40).notNullable().defaultTo('En attente')
      table.text('description').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
