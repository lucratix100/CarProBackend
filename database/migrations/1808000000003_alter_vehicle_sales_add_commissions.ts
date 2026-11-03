import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicle_sales'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('agency_commission').notNullable().defaultTo(0)
      table.integer('paid_commission').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('agency_commission')
      table.dropColumn('paid_commission')
    })
  }
}
