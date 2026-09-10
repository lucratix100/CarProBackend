import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('marque_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('marques')
        .onDelete('RESTRICT')
      table
        .integer('modele_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('modeles')
        .onDelete('RESTRICT')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('marque_id')
      table.dropColumn('modele_id')
    })
  }
}
