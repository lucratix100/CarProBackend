import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Voitures d’agence : owner_id devient nullable.
 * null = propriété de l’agence (pas de portail propriétaire).
 */
export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['owner_id'])
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.integer('owner_id').unsigned().nullable().alter()
      table
        .foreign('owner_id')
        .references('id')
        .inTable('owners')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.defer(async (db) => {
      const orphans = await db.from('vehicles').whereNull('owner_id').count('* as total')
      const total = Number((orphans[0] as { total?: string | number })?.total ?? 0)
      if (total > 0) {
        throw new Error(
          'Impossible de rollback : des véhicules sans propriétaire existent. Assignez-leur un owner_id d’abord.'
        )
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['owner_id'])
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.integer('owner_id').unsigned().notNullable().alter()
      table
        .foreign('owner_id')
        .references('id')
        .inTable('owners')
        .onDelete('RESTRICT')
    })
  }
}
