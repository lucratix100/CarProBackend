import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Catalogue partagé (agency_id null) + créations privées à l'agence.
 * L'unicité du nom devient insensible à la casse, par périmètre.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('marques', (table) => {
      table.dropUnique(['name'])
      table
        .integer('agency_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table.index(['agency_id'])
    })

    this.schema.alterTable('modeles', (table) => {
      table.dropUnique(['marque_id', 'name'])
      table
        .integer('agency_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('agencies')
        .onDelete('RESTRICT')
      table.index(['agency_id'])
    })

    this.schema.raw(
      'CREATE UNIQUE INDEX marques_shared_name_unique ON marques (lower(name)) WHERE agency_id IS NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX marques_agency_name_unique ON marques (agency_id, lower(name)) WHERE agency_id IS NOT NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX modeles_shared_name_unique ON modeles (marque_id, lower(name)) WHERE agency_id IS NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX modeles_agency_name_unique ON modeles (agency_id, marque_id, lower(name)) WHERE agency_id IS NOT NULL'
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS marques_shared_name_unique')
    this.schema.raw('DROP INDEX IF EXISTS marques_agency_name_unique')
    this.schema.raw('DROP INDEX IF EXISTS modeles_shared_name_unique')
    this.schema.raw('DROP INDEX IF EXISTS modeles_agency_name_unique')

    this.schema.alterTable('marques', (table) => {
      table.dropForeign(['agency_id'])
      table.dropIndex(['agency_id'])
      table.dropColumn('agency_id')
      table.unique(['name'])
    })

    this.schema.alterTable('modeles', (table) => {
      table.dropForeign(['agency_id'])
      table.dropIndex(['agency_id'])
      table.dropColumn('agency_id')
      table.unique(['marque_id', 'name'])
    })
  }
}
