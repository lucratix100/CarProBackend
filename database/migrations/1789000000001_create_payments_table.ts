import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('invoice_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('invoices')
        .onDelete('CASCADE')
      table.integer('amount').notNullable()
      table.date('paid_on').notNullable()
      table.string('method', 40).nullable()
      table.string('reference', 120).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.defer(async (db) => {
      const rentals = await db
        .from('rentals')
        .join('invoices', 'invoices.rental_id', 'rentals.id')
        .where('rentals.amount_paid', '>', 0)
        .select(
          'invoices.id as invoice_id',
          'rentals.amount_paid as amount',
          'rentals.created_at as created_at'
        )

      const now = new Date()
      for (const row of rentals) {
        const existing = await db.from('payments').where('invoice_id', row.invoice_id).first()
        if (existing) continue

        const paidOn = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : now.toISOString().slice(0, 10)
        await db.table('payments').insert({
          invoice_id: row.invoice_id,
          amount: row.amount,
          paid_on: paidOn,
          method: 'Espèces',
          notes: 'Paiement initial (migration)',
          created_at: now,
          updated_at: now,
        })
      }
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
