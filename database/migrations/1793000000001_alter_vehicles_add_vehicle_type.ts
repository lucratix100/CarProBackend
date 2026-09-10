import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_VEHICLE_TYPE } from '#constants/vehicle_types'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('vehicle_type', 40).notNullable().defaultTo(DEFAULT_VEHICLE_TYPE)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('vehicle_type')
    })
  }
}
