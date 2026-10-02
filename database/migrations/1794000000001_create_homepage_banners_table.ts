import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'homepage_banners'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('title', 120).notNullable()
      table.text('body').nullable()
      table.string('image_path', 500).nullable()
      table.string('link_url', 500).nullable()
      table.string('link_label', 80).nullable()
      table.string('placement', 40).notNullable().defaultTo('below_hero')
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.date('starts_at').nullable()
      table.date('ends_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['is_active', 'sort_order'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
