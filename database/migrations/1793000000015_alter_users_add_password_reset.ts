import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('password_reset_token', 64).nullable().unique()
      table.timestamp('password_reset_expires_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('password_reset_token')
      table.dropColumn('password_reset_expires_at')
    })
  }
}
