import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Index pour listes / filtres super-admin et agrégats trafic métier.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('client_accounts', (table) => {
      table.index(['status', 'created_at'], 'client_accounts_status_created_at_idx')
      table.index(['created_at'], 'client_accounts_created_at_idx')
    })

    this.schema.alterTable('rentals', (table) => {
      table.index(['source', 'created_at'], 'rentals_source_created_at_idx')
    })
  }

  async down() {
    this.schema.alterTable('client_accounts', (table) => {
      table.dropIndex(['status', 'created_at'], 'client_accounts_status_created_at_idx')
      table.dropIndex(['created_at'], 'client_accounts_created_at_idx')
    })

    this.schema.alterTable('rentals', (table) => {
      table.dropIndex(['source', 'created_at'], 'rentals_source_created_at_idx')
    })
  }
}
