import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  protected tableName = 'maintenances'

  async up() {
    await db.rawQuery(`
      ALTER TABLE maintenances
      ADD COLUMN IF NOT EXISTS charged_to varchar(16) NOT NULL DEFAULT 'owner'
    `)

    // Flotte propre : ces frais étaient déjà déduits du résultat agence.
    await db.rawQuery(`
      UPDATE maintenances AS m
      SET charged_to = 'agency'
      FROM vehicles AS v
      WHERE m.vehicle_id = v.id AND v.owner_id IS NULL
    `)
  }

  async down() {
    await db.rawQuery(`ALTER TABLE maintenances DROP COLUMN IF EXISTS charged_to`)
  }
}
