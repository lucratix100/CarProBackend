import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('full_name', 160).notNullable()
      table.string('phone', 40).notNullable()
      table.string('email', 254).nullable()
      table.string('license_number', 80).nullable()
      table.string('city', 120).nullable()
      table.date('birth_date').nullable()
      table.string('type', 20).notNullable().defaultTo('particulier')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
