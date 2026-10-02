import { BaseSchema } from '@adonisjs/lucid/schema'

function agencyNameKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 160)
}

export default class extends BaseSchema {
  protected tableName = 'agencies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name_key', 160).nullable()
    })

    this.defer(async (db) => {
      const rows = await db.from(this.tableName).select('id', 'name').orderBy('id', 'asc')
      const seen = new Set<string>()
      for (const row of rows) {
        let key = agencyNameKey(String(row.name ?? '')) || `agence${row.id}`
        if (seen.has(key)) {
          const suffix = String(row.id)
          key = `${key.slice(0, 160 - suffix.length)}${suffix}`
        }
        seen.add(key)
        await db.from(this.tableName).where('id', row.id).update({ name_key: key })
      }
      await db.raw('ALTER TABLE agencies ALTER COLUMN name_key SET NOT NULL')
      await db.raw('CREATE UNIQUE INDEX agencies_name_key_unique ON agencies (name_key)')
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.raw('DROP INDEX IF EXISTS agencies_name_key_unique')
    })
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('name_key')
    })
  }
}
