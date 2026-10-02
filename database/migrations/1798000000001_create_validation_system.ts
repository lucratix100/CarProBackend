import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('agency_sensitive_action_settings', (table) => {
      table.increments('id').notNullable()
      table
        .integer('agency_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table.string('action_code', 80).notNullable()
      table
        .string('mode', 30)
        .notNullable()
        .defaultTo('free')
        .comment('free|notify|require_approval')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['agency_id', 'action_code'])
      table.index(['agency_id'])
    })

    this.schema.createTable('validation_requests', (table) => {
      table.increments('id').notNullable()
      table
        .integer('agency_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table
        .integer('requester_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('requester_name', 160).nullable()
      table.string('action_code', 80).notNullable()
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
      table.jsonb('payload').nullable()
      table.string('summary', 500).nullable()
      table
        .string('status', 20)
        .notNullable()
        .defaultTo('pending')
        .comment('pending|approved|rejected')
      table
        .integer('reviewed_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('reviewed_by_name', 160).nullable()
      table.string('review_note', 500).nullable()
      table.timestamp('reviewed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['agency_id', 'status', 'created_at'])
      table.index(['agency_id', 'action_code'])
      table.index(['requester_user_id'])
    })
  }

  async down() {
    this.schema.dropTable('validation_requests')
    this.schema.dropTable('agency_sensitive_action_settings')
  }
}
