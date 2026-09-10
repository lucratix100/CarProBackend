import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'marketplace_reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('rental_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('rentals')
        .onDelete('CASCADE')
      table
        .integer('client_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('clients')
        .onDelete('CASCADE')
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
        .onDelete('CASCADE')
      table.decimal('overall_score', 3, 2).notNullable()
      table.tinyint('cleanliness').unsigned().notNullable()
      table.tinyint('punctuality').unsigned().notNullable()
      table.tinyint('vehicle_condition').unsigned().notNullable()
      table.tinyint('communication').unsigned().notNullable()
      table.text('comment').nullable()
      table.string('status', 20).notNullable().defaultTo('published')
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
