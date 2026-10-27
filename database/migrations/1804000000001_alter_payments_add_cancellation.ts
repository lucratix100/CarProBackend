import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('cancelled_at').nullable()
      table.index(['invoice_id', 'cancelled_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['invoice_id', 'cancelled_at'])
      table.dropColumn('cancelled_at')
    })
  }
}
