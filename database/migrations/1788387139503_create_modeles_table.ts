import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'modeles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('marque_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('marques')
        .onDelete('CASCADE')
      table.string('name', 80).notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['marque_id', 'name'])
      table.index(['marque_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
