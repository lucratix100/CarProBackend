import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agencies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('can_use_custom_logo').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('can_use_custom_logo')
    })
  }
}
