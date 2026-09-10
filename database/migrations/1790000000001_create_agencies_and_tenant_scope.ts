import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Multi-tenant : agences + agency_id sur les données métier.
 * Backfill : une agence par défaut « PCS » pour les données existantes.
 * Les admins existants deviennent super_admin (plateforme).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('agencies', (table) => {
      table.increments('id').notNullable()
      table.string('name', 160).notNullable()
      table.string('slug', 80).notNullable().unique()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.alterTable('users', (table) => {
      table
        .integer('agency_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table.index(['agency_id'])
    })

    this.schema.alterTable('owners', (table) => {
      table.integer('agency_id').unsigned().nullable()
    })

    this.schema.alterTable('clients', (table) => {
      table.integer('agency_id').unsigned().nullable()
    })

    this.schema.alterTable('vehicles', (table) => {
      table.integer('agency_id').unsigned().nullable()
    })

    this.schema.alterTable('settings', (table) => {
      table.integer('agency_id').unsigned().nullable()
    })

    this.schema.alterTable('rentals', (table) => {
      table.integer('agency_id').unsigned().nullable()
    })

    this.schema.alterTable('invoices', (table) => {
      table.integer('agency_id').unsigned().nullable()
    })

    this.defer(async (db) => {
      const now = new Date()
      const inserted = await db
        .table('agencies')
        .insert({
          name: 'Profil Car Service',
          slug: 'pcs',
          is_active: true,
          notes: 'Agence par défaut (migration multi-tenant)',
          created_at: now,
          updated_at: now,
        })
        .returning('id')

      const agencyId = Number(
        Array.isArray(inserted) ? (inserted[0] as { id: number }).id : inserted
      )

      await db.from('users').where('role', 'admin').update({ role: 'super_admin' })
      await db.from('owners').update({ agency_id: agencyId })
      await db.from('clients').update({ agency_id: agencyId })
      await db.from('vehicles').update({ agency_id: agencyId })
      await db.from('settings').update({ agency_id: agencyId })
      await db.from('rentals').update({ agency_id: agencyId })
      await db.from('invoices').update({ agency_id: agencyId })
      await db.from('users').where('role', 'owner').update({ agency_id: agencyId })
    })

    this.schema.alterTable('owners', (table) => {
      table.integer('agency_id').unsigned().notNullable().alter()
      table
        .foreign('agency_id')
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table.index(['agency_id'])
    })

    this.schema.alterTable('clients', (table) => {
      table.integer('agency_id').unsigned().notNullable().alter()
      table
        .foreign('agency_id')
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table.index(['agency_id'])
    })

    this.schema.alterTable('vehicles', (table) => {
      table.dropUnique(['plate'])
      table.integer('agency_id').unsigned().notNullable().alter()
      table
        .foreign('agency_id')
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table.unique(['agency_id', 'plate'])
      table.index(['agency_id'])
    })

    this.schema.alterTable('settings', (table) => {
      table.integer('agency_id').unsigned().notNullable().alter()
      table
        .foreign('agency_id')
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table.unique(['agency_id'])
    })

    this.schema.alterTable('rentals', (table) => {
      table.integer('agency_id').unsigned().notNullable().alter()
      table
        .foreign('agency_id')
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table.index(['agency_id'])
    })

    this.schema.alterTable('invoices', (table) => {
      table.integer('agency_id').unsigned().notNullable().alter()
      table
        .foreign('agency_id')
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table.index(['agency_id'])
    })
  }

  async down() {
    this.schema.alterTable('invoices', (table) => {
      table.dropForeign(['agency_id'])
      table.dropColumn('agency_id')
    })
    this.schema.alterTable('rentals', (table) => {
      table.dropForeign(['agency_id'])
      table.dropColumn('agency_id')
    })
    this.schema.alterTable('settings', (table) => {
      table.dropForeign(['agency_id'])
      table.dropUnique(['agency_id'])
      table.dropColumn('agency_id')
    })
    this.schema.alterTable('vehicles', (table) => {
      table.dropForeign(['agency_id'])
      table.dropUnique(['agency_id', 'plate'])
      table.dropColumn('agency_id')
      table.unique(['plate'])
    })
    this.schema.alterTable('clients', (table) => {
      table.dropForeign(['agency_id'])
      table.dropColumn('agency_id')
    })
    this.schema.alterTable('owners', (table) => {
      table.dropForeign(['agency_id'])
      table.dropColumn('agency_id')
    })
    this.schema.alterTable('users', (table) => {
      table.dropForeign(['agency_id'])
      table.dropColumn('agency_id')
    })

    this.defer(async (db) => {
      await db.from('users').where('role', 'super_admin').update({ role: 'admin' })
    })

    this.schema.dropTable('agencies')
  }
}
