import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('activity_logs', (table) => {
      table.increments('id').notNullable()
      table
        .integer('agency_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('agencies')
        .onDelete('SET NULL')
      table
        .integer('actor_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('actor_name', 160).nullable()
      table.string('actor_email', 254).nullable()
      table.string('action', 80).notNullable()
      table.string('module', 40).notNullable()
      table.string('entity_type', 40).nullable()
      table.integer('entity_id').unsigned().nullable()
      table
        .integer('client_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('clients')
        .onDelete('SET NULL')
      table
        .integer('rental_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('rentals')
        .onDelete('SET NULL')
      table
        .integer('vehicle_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('SET NULL')
      table.jsonb('old_values').nullable()
      table.jsonb('new_values').nullable()
      table.string('summary', 500).nullable()
      table
        .string('result', 30)
        .notNullable()
        .defaultTo('success')
        .comment('success|denied|pending_validation|approved|rejected')
      table
        .integer('validated_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('validated_by_name', 160).nullable()
      table.string('ip', 64).nullable()
      table.timestamp('created_at').notNullable()

      table.index(['agency_id', 'created_at'])
      table.index(['agency_id', 'actor_user_id', 'created_at'])
      table.index(['agency_id', 'module', 'created_at'])
      table.index(['agency_id', 'action', 'created_at'])
      table.index(['entity_type', 'entity_id'])
      table.index(['rental_id'])
      table.index(['client_id'])
      table.index(['vehicle_id'])
    })

    this.schema.alterTable('clients', (table) => {
      table
        .integer('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('updated_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
    })

    this.schema.alterTable('rentals', (table) => {
      table
        .integer('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('updated_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
    })

    this.schema.alterTable('vehicles', (table) => {
      table
        .integer('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('updated_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable('vehicles', (table) => {
      table.dropColumn('created_by_user_id')
      table.dropColumn('updated_by_user_id')
    })
    this.schema.alterTable('rentals', (table) => {
      table.dropColumn('created_by_user_id')
      table.dropColumn('updated_by_user_id')
    })
    this.schema.alterTable('clients', (table) => {
      table.dropColumn('created_by_user_id')
      table.dropColumn('updated_by_user_id')
    })
    this.schema.dropTable('activity_logs')
  }
}
