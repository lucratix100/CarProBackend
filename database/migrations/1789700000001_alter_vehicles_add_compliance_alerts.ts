import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('insurance_alert_stage', 20).nullable()
      table.string('technical_visit_alert_stage', 20).nullable()
      table.boolean('compliance_hold').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('insurance_alert_stage')
      table.dropColumn('technical_visit_alert_stage')
      table.dropColumn('compliance_hold')
    })
  }
}
