import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('offer_type', 20).notNullable().defaultTo('rent')
      table.integer('sale_price').nullable()
      table.boolean('sale_negotiable').notNullable().defaultTo(true)
      table.index(['offer_type'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['offer_type'])
      table.dropColumn('offer_type')
      table.dropColumn('sale_price')
      table.dropColumn('sale_negotiable')
    })
  }
}
