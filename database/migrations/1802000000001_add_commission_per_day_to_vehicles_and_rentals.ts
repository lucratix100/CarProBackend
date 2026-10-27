import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * Commission par véhicule, figée sur chaque location.
 * Le remplissage reprend le barème d'agence actuel : les calculs déjà affichés ne changent pas.
 */
export default class extends BaseSchema {
  async up() {
    await db.rawQuery(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS commission_per_day integer NOT NULL DEFAULT 10000
    `)
    await db.rawQuery(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS commission_per_day integer NOT NULL DEFAULT 10000
    `)

    await db.rawQuery(`
      UPDATE vehicles AS v
      SET commission_per_day = s.commission_per_day
      FROM settings AS s
      WHERE v.agency_id = s.agency_id
    `)
    await db.rawQuery(`
      UPDATE rentals AS r
      SET commission_per_day = s.commission_per_day
      FROM settings AS s
      WHERE r.agency_id = s.agency_id
    `)
  }

  async down() {
    await db.rawQuery(`ALTER TABLE rentals DROP COLUMN IF EXISTS commission_per_day`)
    await db.rawQuery(`ALTER TABLE vehicles DROP COLUMN IF EXISTS commission_per_day`)
  }
}
