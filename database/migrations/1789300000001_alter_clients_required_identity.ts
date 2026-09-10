import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clients'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('license_expires_at').nullable()
      table.string('id_card_number', 80).nullable()
    })

    this.defer(async (db) => {
      await db.from('clients').whereNull('license_number').update({
        license_number: 'À COMPLÉTER',
      })
      await db.from('clients').whereNull('id_card_number').update({
        id_card_number: 'À COMPLÉTER',
      })
      await db.from('clients').whereNull('license_expires_at').update({
        license_expires_at: '2099-12-31',
      })
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.string('license_number', 80).notNullable().alter()
      table.date('license_expires_at').notNullable().alter()
      table.string('id_card_number', 80).notNullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('license_expires_at')
      table.dropColumn('id_card_number')
      table.string('license_number', 80).nullable().alter()
    })
  }
}
