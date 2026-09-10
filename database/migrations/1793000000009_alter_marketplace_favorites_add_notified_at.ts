import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'marketplace_favorites'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('notified_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('notified_at')
    })
  }
}
