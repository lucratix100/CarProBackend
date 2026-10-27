import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Collaborateurs, validations et journal restent masqués
 * tant que le super admin n’a pas autorisé le module.
 * Un plafond de places déjà fixé (> 0) compte comme une autorisation.
 */
export default class extends BaseSchema {
  protected tableName = 'agencies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('staff_module_enabled').notNullable().defaultTo(false)
    })

    this.defer(async (db) => {
      await db.from(this.tableName).where('staff_limit', '>', 0).update({
        staff_module_enabled: true,
      })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('staff_module_enabled')
    })
  }
}
