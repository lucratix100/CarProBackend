import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('marketplace_publication_events', (table) => {
      table.increments('id').notNullable()
      table
        .integer('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('CASCADE')
      table
        .integer('agency_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table
        .string('action', 40)
        .notNullable()
        .comment('submitted|approved|rejected|unpublished|rereview_requested|agency_unpublished')
      table.text('reason').nullable()
      table
        .integer('actor_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()

      table.index(['vehicle_id', 'created_at'])
      table.index(['agency_id', 'action'])
    })

    this.schema.alterTable('vehicles', (table) => {
      table.boolean('marketplace_is_rereview').notNullable().defaultTo(false)
    })

    this.schema.alterTable('agencies', (table) => {
      table.integer('marketplace_rejection_streak').unsigned().notNullable().defaultTo(0)
      table.timestamp('marketplace_publish_banned_until', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable('agencies', (table) => {
      table.dropColumn('marketplace_rejection_streak')
      table.dropColumn('marketplace_publish_banned_until')
    })
    this.schema.alterTable('vehicles', (table) => {
      table.dropColumn('marketplace_is_rereview')
    })
    this.schema.dropTable('marketplace_publication_events')
  }
}
