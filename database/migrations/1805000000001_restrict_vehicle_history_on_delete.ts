import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * L’historique financier d’un véhicule ne doit pas disparaître avec lui.
 * Locations, dépenses et entretiens bloquent la suppression (RESTRICT).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('vehicle_expenses', (table) => {
      table.dropForeign(['vehicle_id'])
    })
    this.schema.alterTable('vehicle_expenses', (table) => {
      table.foreign('vehicle_id').references('id').inTable('vehicles').onDelete('RESTRICT')
    })

    this.schema.alterTable('maintenances', (table) => {
      table.dropForeign(['vehicle_id'])
    })
    this.schema.alterTable('maintenances', (table) => {
      table.foreign('vehicle_id').references('id').inTable('vehicles').onDelete('RESTRICT')
    })
  }

  async down() {
    this.schema.alterTable('vehicle_expenses', (table) => {
      table.dropForeign(['vehicle_id'])
    })
    this.schema.alterTable('vehicle_expenses', (table) => {
      table.foreign('vehicle_id').references('id').inTable('vehicles').onDelete('CASCADE')
    })

    this.schema.alterTable('maintenances', (table) => {
      table.dropForeign(['vehicle_id'])
    })
    this.schema.alterTable('maintenances', (table) => {
      table.foreign('vehicle_id').references('id').inTable('vehicles').onDelete('CASCADE')
    })
  }
}
