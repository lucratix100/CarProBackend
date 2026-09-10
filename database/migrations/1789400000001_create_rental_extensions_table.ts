import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rental_extensions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('rental_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('rentals')
        .onDelete('CASCADE')
      table.date('previous_end_date').notNullable()
      table.date('new_end_date').notNullable()
      table.integer('added_days').notNullable()
      table.integer('daily_price').notNullable()
      table.integer('amount_ht').notNullable()
      table.text('notes').nullable()
      table
        .integer('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['rental_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
