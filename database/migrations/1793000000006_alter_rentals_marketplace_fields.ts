import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rentals'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('source', 20).notNullable().defaultTo('agency')
      table.text('cancel_reason').nullable()
      table.timestamp('cancelled_at').nullable()
      table.string('cancelled_by', 20).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('source')
      table.dropColumn('cancel_reason')
      table.dropColumn('cancelled_at')
      table.dropColumn('cancelled_by')
    })
  }
}
