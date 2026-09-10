import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'maintenances'

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
      table.string('type', 80).notNullable()
      table.date('performed_on').notNullable()
      table.integer('cost').notNullable().defaultTo(0)
      table.integer('mileage').nullable()
      table.string('provider', 160).nullable()
      table.date('next_due_on').nullable()
      table.integer('alert_days').notNullable().defaultTo(7)
      table.text('description').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
