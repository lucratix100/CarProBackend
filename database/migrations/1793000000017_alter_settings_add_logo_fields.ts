import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('logo_path', 500).nullable()
      table.string('logo_pending_path', 500).nullable()
      table.string('logo_rejection_reason', 500).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('logo_path')
      table.dropColumn('logo_pending_path')
      table.dropColumn('logo_rejection_reason')
    })
  }
}
