import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('role', 20).notNullable().defaultTo('owner')
      table.string('status', 20).notNullable().defaultTo('active')
      table.string('invitation_token', 64).nullable().unique()
      table.timestamp('invitation_expires_at', { useTz: true }).nullable()
      table.timestamp('password_set_at', { useTz: true }).nullable()
      table.string('terms_version', 40).nullable()
      table.timestamp('terms_accepted_at', { useTz: true }).nullable()
      table.string('terms_accepted_ip', 64).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('role')
      table.dropColumn('status')
      table.dropColumn('invitation_token')
      table.dropColumn('invitation_expires_at')
      table.dropColumn('password_set_at')
      table.dropColumn('terms_version')
      table.dropColumn('terms_accepted_at')
      table.dropColumn('terms_accepted_ip')
    })
  }
}
