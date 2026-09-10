import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name', 120).notNullable()
      table.string('region', 120).notNullable()
      table.string('slug', 140).notNullable().unique()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['region', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
