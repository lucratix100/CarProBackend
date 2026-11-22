import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

function countOf(rows: { total?: string | number }[] | Record<string, unknown>[]) {
  const row = rows[0] as { total?: string | number } | undefined
  return Number(row?.total ?? 0)
}

/**
 * Métriques métier légères pour le super-admin (complément Plausible).
 * Agrégats COUNT parallèles + série d’inscriptions — pas de pageviews en DB.
 */
export default class PlatformAnalyticsController {
  async overview({ response }: HttpContext) {
    const now = DateTime.utc()
    const since7 = now.minus({ days: 7 }).toSQL()!
    const since30 = now.minus({ days: 30 }).toSQL()!
    const since14 = now.minus({ days: 13 }).startOf('day').toSQL()!

    const [
      accountsTotal,
      accountsActive,
      accountsInactive,
      accountsNew7,
      accountsNew30,
      bookingsTotal,
      bookings7,
      bookings30,
      bookingsPending,
      publishedVehicles,
      openReports,
      pendingPublications,
      signupRows,
    ] = await Promise.all([
      db.from('client_accounts').count('* as total'),
      db.from('client_accounts').where('status', 'active').count('* as total'),
      db.from('client_accounts').where('status', 'inactive').count('* as total'),
      db.from('client_accounts').where('created_at', '>=', since7).count('* as total'),
      db.from('client_accounts').where('created_at', '>=', since30).count('* as total'),
      db.from('rentals').where('source', 'marketplace').count('* as total'),
      db.from('rentals').where('source', 'marketplace').where('created_at', '>=', since7).count('* as total'),
      db
        .from('rentals')
        .where('source', 'marketplace')
        .where('created_at', '>=', since30)
        .count('* as total'),
      db
        .from('rentals')
        .where('source', 'marketplace')
        .where('status', 'En attente')
        .count('* as total'),
      db
        .from('vehicles')
        .where('marketplace_publication_status', 'published')
        .count('* as total'),
      db.from('marketplace_reports').where('status', 'open').count('* as total'),
      db
        .from('vehicles')
        .where('marketplace_publication_status', 'pending_review')
        .count('* as total'),
      this.#signupSeries(since14),
    ])

    const signupsByDay = this.#fillSignupSeries(signupRows, now)

    return response.ok({
      generatedAt: now.toISO(),
      accounts: {
        total: countOf(accountsTotal),
        active: countOf(accountsActive),
        inactive: countOf(accountsInactive),
        new7d: countOf(accountsNew7),
        new30d: countOf(accountsNew30),
      },
      bookings: {
        total: countOf(bookingsTotal),
        last7d: countOf(bookings7),
        last30d: countOf(bookings30),
        pending: countOf(bookingsPending),
      },
      catalog: {
        publishedVehicles: countOf(publishedVehicles),
        pendingPublications: countOf(pendingPublications),
        openReports: countOf(openReports),
      },
      signupsByDay,
      webTraffic: {
        provider: 'plausible',
        configured: Boolean(env.get('PLAUSIBLE_DOMAIN')),
        domain: env.get('PLAUSIBLE_DOMAIN') ?? null,
        dashboardUrl: env.get('PLAUSIBLE_DASHBOARD_URL') ?? null,
      },
    })
  }

  async #signupSeries(since14: string) {
    const dialect = db.connection().dialectName
    if (dialect === 'postgres') {
      return db
        .from('client_accounts')
        .select(db.raw("date_trunc('day', created_at)::date as day"))
        .count('* as total')
        .where('created_at', '>=', since14)
        .groupByRaw("date_trunc('day', created_at)::date")
        .orderBy('day', 'asc')
    }

    return db
      .from('client_accounts')
      .select(db.raw("date(created_at) as day"))
      .count('* as total')
      .where('created_at', '>=', since14)
      .groupByRaw('date(created_at)')
      .orderBy('day', 'asc')
  }

  #fillSignupSeries(
    rows: { day?: string | Date; total?: string | number }[],
    now: DateTime
  ) {
    const map = new Map<string, number>()
    for (const row of rows) {
      const raw = row.day
      const key =
        raw instanceof Date
          ? DateTime.fromJSDate(raw, { zone: 'utc' }).toISODate()
          : String(raw).slice(0, 10)
      if (key) map.set(key, Number(row.total ?? 0))
    }

    const series: { date: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const date = now.minus({ days: i }).toISODate()!
      series.push({ date, count: map.get(date) ?? 0 })
    }
    return series
  }
}
