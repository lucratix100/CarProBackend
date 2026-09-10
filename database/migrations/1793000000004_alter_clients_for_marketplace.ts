import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Clients marketplace : agency_id nullable, identité assouplie,
 * source (agency | marketplace), unicité soft via index uniques partiels si supportés.
 */
export default class extends BaseSchema {
  protected tableName = 'clients'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('source', 20).notNullable().defaultTo('agency')
      table.string('license_number', 80).nullable().alter()
      table.date('license_expires_at').nullable().alter()
      table.string('id_card_number', 80).nullable().alter()
    })

    // agency_id peut déjà être NOT NULL selon migrations ; le rendre nullable
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('agency_id').unsigned().nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('source')
    })
  }
}
