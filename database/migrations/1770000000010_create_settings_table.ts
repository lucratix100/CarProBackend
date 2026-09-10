import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('company_name', 160).notNullable().defaultTo('Profil Car Service')
      table.integer('commission_per_day').notNullable().defaultTo(10000)
      table.decimal('tva_rate', 5, 4).notNullable().defaultTo(0.18)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
