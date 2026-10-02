import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'partner_applications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .string('type', 20)
        .notNullable()
        .comment('agency|owner')
      table
        .string('status', 20)
        .notNullable()
        .defaultTo('pending')
        .comment('pending|approved|rejected|cancelled')
      table
        .integer('client_account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('client_accounts')
        .onDelete('SET NULL')
      table.string('full_name', 120).notNullable()
      table.string('email', 254).notNullable()
      table.string('phone', 40).notNullable()
      table
        .integer('city_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('cities')
        .onDelete('SET NULL')
      table.string('agency_name', 160).nullable()
      table
        .integer('requested_agency_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('agencies')
        .onDelete('SET NULL')
      table.integer('fleet_size').unsigned().nullable()
      table.text('message').nullable()
      table
        .integer('reviewed_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('reviewed_at').nullable()
      table.string('rejection_reason', 500).nullable()
      table
        .integer('created_agency_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('agencies')
        .onDelete('SET NULL')
      table
        .integer('created_owner_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('owners')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['type', 'status'])
      table.index(['email', 'type', 'status'])
      table.index(['requested_agency_id', 'status'])
      table.index(['client_account_id', 'type', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
