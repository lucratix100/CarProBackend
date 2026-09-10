import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agencies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('city_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('cities')
        .onDelete('SET NULL')
      table.boolean('publish_on_marketplace').notNullable().defaultTo(false)
      table.index(['city_id'])
      table.index(['publish_on_marketplace'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['publish_on_marketplace'])
      table.dropIndex(['city_id'])
      table.dropForeign(['city_id'])
      table.dropColumn('city_id')
      table.dropColumn('publish_on_marketplace')
    })
  }
}
