import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agencies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_verified').notNullable().defaultTo(false)
      table.index(['is_verified'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['is_verified'])
      table.dropColumn('is_verified')
    })
  }
}
