import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Plafonds d’abonnement par agence.
 * Limites nulles = pas de plafond (agences déjà en production).
 * accept_owner_applications défaut true pour les agences existantes.
 */
export default class extends BaseSchema {
  protected tableName = 'agencies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('vehicle_limit').unsigned().nullable()
      table.integer('staff_limit').unsigned().nullable()
      table.boolean('staff_paused').notNullable().defaultTo(false)
      table.boolean('accept_owner_applications').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('vehicle_limit')
      table.dropColumn('staff_limit')
      table.dropColumn('staff_paused')
      table.dropColumn('accept_owner_applications')
    })
  }
}
