import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('agencies', (table) => {
      table.boolean('can_use_custom_signature').notNullable().defaultTo(false)
    })

    this.schema.alterTable('settings', (table) => {
      table.string('signature_pending_path', 500).nullable()
      table.string('signature_rejection_reason', 500).nullable()
    })
  }

  async down() {
    this.schema.alterTable('agencies', (table) => {
      table.dropColumn('can_use_custom_signature')
    })

    this.schema.alterTable('settings', (table) => {
      table.dropColumn('signature_pending_path')
      table.dropColumn('signature_rejection_reason')
    })
  }
}
