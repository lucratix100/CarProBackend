import { DateTime } from 'luxon'
import type Rental from '#models/rental'
import Setting from '#models/setting'

export type RentalFinancials = {
  days: number
  /** Total HT (prix/jour × jours) */
  grossTotal: number
  commission: number
  netTotal: number
  netDailyPrice: number
  tvaRate: number
  tva: number
  /** Total TTC (HT + TVA) — référentiel client / paiements */
  ttc: number
}

/** Inclusive day count between two ISO dates / DateTimes. Always >= 1. */
export function daysBetween(start: DateTime | string, end: DateTime | string) {
  const a = typeof start === 'string' ? DateTime.fromISO(start) : start.startOf('day')
  const b = typeof end === 'string' ? DateTime.fromISO(end) : end.startOf('day')
  if (!a.isValid || !b.isValid) return 1
  return Math.max(1, Math.floor(b.diff(a, 'days').days) + 1)
}

export function todayISO() {
  return DateTime.now().toISODate()!
}

export type ComputedRentalStatus = 'Réservée' | 'En cours' | 'Terminée'

/** Statut dérivé des dates (hors Annulée). */
export function resolveRentalStatus(
  startDate: string,
  endDate: string,
  today: string = todayISO()
): ComputedRentalStatus {
  if (endDate < today) return 'Terminée'
  if (startDate <= today && endDate >= today) return 'En cours'
  return 'Réservée'
}

export function invoiceAmounts(amountHt: number, tvaRate: number) {
  const tva = Math.round(amountHt * tvaRate)
  const ttc = amountHt + tva
  return { amountHt, tva, ttc, tvaRate }
}

export async function rentalFinancials(
  rental: Pick<Rental, 'startDate' | 'endDate' | 'dailyPrice'> & { agencyId?: number },
  commissionPerDay?: number,
  tvaRate?: number
): Promise<RentalFinancials> {
  let commissionDay = commissionPerDay
  let rate = tvaRate

  if (commissionDay === undefined || rate === undefined) {
    if (!rental.agencyId) {
      throw new Error(
        'agencyId requis pour charger les paramètres financiers, ou passer commissionPerDay et tvaRate.'
      )
    }
    const settings = await Setting.current(rental.agencyId)
    commissionDay = Number(commissionDay ?? settings.commissionPerDay)
    rate = Number(rate ?? settings.tvaRate)
  }

  const days = daysBetween(rental.startDate, rental.endDate)
  const grossTotal = rental.dailyPrice * days
  const commission = Number(commissionDay) * days
  const netTotal = Math.max(0, grossTotal - commission)
  const netDailyPrice = Math.max(0, rental.dailyPrice - Number(commissionDay))
  const tax = invoiceAmounts(grossTotal, Number(rate))

  return {
    days,
    grossTotal,
    commission,
    netTotal,
    netDailyPrice,
    tvaRate: tax.tvaRate,
    tva: tax.tva,
    ttc: tax.ttc,
  }
}
