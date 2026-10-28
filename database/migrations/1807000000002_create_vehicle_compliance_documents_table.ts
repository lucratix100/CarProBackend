import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicle_compliance_documents'

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
      table.string('kind', 32).notNullable()
      table.string('provider', 160).notNullable()
      table.string('reference', 80).nullable()
      table.date('starts_on').nullable()
      table.date('expires_on').notNullable()
      table.integer('cost').notNullable().defaultTo(0)
      table.string('charged_to', 16).notNullable().defaultTo('owner')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['vehicle_id', 'kind'])
      table.index(['expires_on'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
