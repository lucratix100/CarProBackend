import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('permissions', (table) => {
      table.increments('id').notNullable()
      table.string('code', 80).notNullable().unique()
      table.string('module', 40).notNullable()
      table.string('label', 160).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['module'])
    })

    this.schema.createTable('staff_roles', (table) => {
      table.increments('id').notNullable()
      table
        .integer('agency_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table.string('slug', 60).notNullable()
      table.string('name', 120).notNullable()
      table.string('description', 500).nullable()
      table.boolean('is_system').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['agency_id'])
    })

    this.schema.raw(
      'CREATE UNIQUE INDEX staff_roles_system_slug_unique ON staff_roles (slug) WHERE agency_id IS NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX staff_roles_agency_slug_unique ON staff_roles (agency_id, slug) WHERE agency_id IS NOT NULL'
    )

    this.schema.createTable('staff_role_permissions', (table) => {
      table.increments('id').notNullable()
      table
        .integer('staff_role_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('staff_roles')
        .onDelete('CASCADE')
      table
        .integer('permission_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('permissions')
        .onDelete('CASCADE')
      table.unique(['staff_role_id', 'permission_id'])
    })

    this.schema.createTable('user_permission_overrides', (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('permission_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('permissions')
        .onDelete('CASCADE')
      table.boolean('granted').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['user_id', 'permission_id'])
    })

    this.schema.alterTable('users', (table) => {
      table
        .integer('staff_role_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('staff_roles')
        .onDelete('SET NULL')
      table.string('job_title', 120).nullable()
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('staff_role_id')
      table.dropColumn('job_title')
    })
    this.schema.dropTable('user_permission_overrides')
    this.schema.dropTable('staff_role_permissions')
    this.schema.dropTable('staff_roles')
    this.schema.dropTable('permissions')
  }
}
