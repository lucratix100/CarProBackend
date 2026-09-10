import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rentals'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
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
      table.date('start_date').notNullable()
      table.date('end_date').notNullable()
      table.integer('daily_price').notNullable()
      table.integer('amount_paid').notNullable().defaultTo(0)
      table.string('status', 40).notNullable().defaultTo('Réservée')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['vehicle_id', 'start_date', 'end_date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
