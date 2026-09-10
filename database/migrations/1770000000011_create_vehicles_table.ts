import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('owner_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('owners')
        .onDelete('RESTRICT')
      table.string('brand', 80).notNullable()
      table.string('model', 80).notNullable()
      table.string('plate', 40).notNullable().unique()
      table.integer('year').nullable()
      table.string('color', 40).nullable()
      table.string('fuel', 40).notNullable().defaultTo('Essence')
      table.string('status', 40).notNullable().defaultTo('Disponible')
      table.integer('mileage').notNullable().defaultTo(0)
      table.integer('daily_price').notNullable().defaultTo(0)
      table.string('insurance_company', 120).nullable()
      table.date('insurance_expires_at').nullable()
      table.date('technical_visit_at').nullable()
      table.string('photo_url', 500).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
