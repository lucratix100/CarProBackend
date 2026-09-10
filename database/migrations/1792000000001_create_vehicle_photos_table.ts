import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicle_photos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('vehicle_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('vehicles')
        .onDelete('CASCADE')
      table.string('path', 500).notNullable()
      table.integer('position').unsigned().notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['vehicle_id', 'position'])
    })

    this.defer(async (db) => {
      const vehicles = await db
        .from('vehicles')
        .whereNotNull('photo_url')
        .where('photo_url', '!=', '')
        .select('id', 'photo_url', 'created_at')

      const now = new Date()
      for (const row of vehicles) {
        const url = String(row.photo_url)
        // Ne migrer que les chemins locaux déjà stockés
        if (!url.startsWith('storage/')) continue
        await db.table('vehicle_photos').insert({
          vehicle_id: row.id,
          path: url,
          position: 0,
          created_at: row.created_at ?? now,
          updated_at: now,
        })
      }
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
