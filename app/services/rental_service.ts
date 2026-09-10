import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import Rental from '#models/rental'
import Vehicle from '#models/vehicle'
import Invoice from '#models/invoice'
import Setting from '#models/setting'
import { daysBetween, rentalFinancials, resolveRentalStatus, todayISO } from '#services/finance_service'
import InvoicePaymentService from '#services/invoice_payment_service'
import OwnerNotificationService from '#services/owner_notification_service'
import { OWNER_NOTIFICATION_TYPES } from '#constants/owner_notification_types'
import MarketplaceBookingDecisionNotification from '#mails/marketplace_booking_decision_notification'

export default class RentalService {
  #notifications() {
    return new OwnerNotificationService()
  }

  async #notifyRental(
    vehicleId: number,
    type: (typeof OWNER_NOTIFICATION_TYPES)[keyof typeof OWNER_NOTIFICATION_TYPES],
    title: string,
    body: string,
    meta?: Record<string, unknown>
  ) {
    try {
      await this.#notifications().notifyVehicleOwner(vehicleId, {
        type,
        title,
        body,
        href: '/portal/rentals',
        meta,
      })
    } catch {
      // Ne pas faire échouer l’opération métier si la notif échoue
    }
  }

  #webClientBase() {
    return (
      env.get('WEB_CLIENT_URL') ||
      env.get('FRONTEND_URL') ||
      'http://localhost:3001'
    ).replace(/\/$/, '')
  }

  /**
   * Email client marketplace après validation / refus (best-effort).
   */
  async #notifyMarketplaceClientDecision(
    rental: Rental,
    decision: 'approved' | 'rejected',
    reason?: string | null
  ) {
    if (rental.source !== 'marketplace') return

    try {
      await rental.load('client', (q) => q.preload('account'))
      await rental.load('vehicle', (vq) => vq.preload('agency'))

      const email =
        rental.client?.account?.email ||
        rental.client?.email ||
        null
      if (!email) return

      await mail.send(
        new MarketplaceBookingDecisionNotification({
          email,
          fullName: rental.client?.account?.fullName || rental.client?.fullName || null,
          vehicleLabel: rental.vehicle?.label ?? `Véhicule #${rental.vehicleId}`,
          agencyName: rental.vehicle?.agency?.name ?? null,
          startDate: rental.startDate.toISODate()!,
          endDate: rental.endDate.toISODate()!,
          decision,
          reason,
          reservationsUrl: `${this.#webClientBase()}/reservations`,
        })
      )
    } catch (error) {
      logger.error(
        { err: error, rentalId: rental.id, decision },
        '[marketplace] Échec email décision réservation'
      )
    }
  }
  /**
   * Returns an overlapping non-cancelled rental for the same vehicle, if any.
   */
  async findConflict(
    vehicleId: number,
    startDate: string,
    endDate: string,
    excludeRentalId?: number
  ) {
    const query = Rental.query()
      .where('vehicleId', vehicleId)
      .whereNot('status', 'Annulée')
      .where('startDate', '<=', endDate)
      .where('endDate', '>=', startDate)

    if (excludeRentalId) {
      query.whereNot('id', excludeRentalId)
    }

    return query.first()
  }

  async assertNoConflict(
    vehicleId: number,
    startDate: string,
    endDate: string,
    excludeRentalId?: number
  ) {
    if (endDate < startDate) {
      throw new Exception('La date de fin doit être postérieure ou égale à la date de début.', {
        status: 422,
        code: 'E_INVALID_DATES',
      })
    }

    const conflict = await this.findConflict(vehicleId, startDate, endDate, excludeRentalId)
    if (conflict) {
      throw new Exception(
        `Conflit : véhicule déjà réservé du ${conflict.startDate.toISODate()} au ${conflict.endDate.toISODate()}.`,
        { status: 422, code: 'E_RENTAL_CONFLICT' }
      )
    }
  }

  /**
   * Sync vehicle status from active rentals covering today.
   * - Entretien manuel préservé
   * - Blocage conformité (assurance/CT) → Hors service hors location active
   */
  async syncVehicleStatus(vehicleId: number) {
    const vehicle = await Vehicle.findOrFail(vehicleId)
    if (vehicle.status === 'Entretien') {
      return vehicle
    }

    const today = todayISO()
    const active = await Rental.query()
      .where('vehicleId', vehicleId)
      .where('status', 'En cours')
      .where('startDate', '<=', today)
      .where('endDate', '>=', today)
      .first()

    if (active) {
      vehicle.status = 'Loué'
    } else if (vehicle.complianceHold) {
      vehicle.status = 'Hors service'
    } else if (vehicle.status === 'Hors service') {
      // Hors service manuel (sans hold conformité) : conserver
      return vehicle
    } else {
      vehicle.status = 'Disponible'
    }

    await vehicle.save()
    return vehicle
  }

  /**
   * Create or update the client invoice for a rental (always at client/gross price).
   */
  async upsertInvoiceForRental(rental: Rental) {
    if (!rental.agencyId) {
      await rental.load('vehicle')
      if (!rental.agencyId && rental.vehicle?.agencyId) {
        rental.agencyId = rental.vehicle.agencyId
      }
    }
    if (!rental.agencyId) {
      throw new Exception('Agence manquante pour la facture de location.', {
        status: 422,
        code: 'E_RENTAL_AGENCY',
      })
    }

    const settings = await Setting.current(rental.agencyId)
    const finance = await rentalFinancials(rental, settings.commissionPerDay)
    await rental.load('vehicle')

    const description = `Location ${rental.vehicle.label} — ${finance.days} jour(s).`
    let invoice = await Invoice.query().where('rentalId', rental.id).first()
    const paymentService = new InvoicePaymentService()

    if (rental.status === 'En attente') {
      return invoice
    }

    if (rental.status === 'Annulée') {
      if (invoice) {
        invoice.description = `${description} (location annulée)`
        await invoice.save()
        await paymentService.syncInvoice(invoice)
      }
      return invoice
    }

    if (invoice) {
      invoice.amountHt = finance.grossTotal
      invoice.description = description
      invoice.clientId = rental.clientId
      await invoice.save()
    } else {
      invoice = await Invoice.create({
        agencyId: rental.agencyId,
        clientId: rental.clientId,
        rentalId: rental.id,
        amountHt: finance.grossTotal,
        issuedOn: DateTime.fromISO(todayISO()),
        status: 'En attente',
        description,
      })
      if (rental.amountPaid > 0) {
        await paymentService.ensureInitialPayment(invoice, rental.amountPaid)
      }
    }

    await paymentService.syncInvoice(invoice)
    return invoice
  }

  async create(payload: {
    agencyId: number
    vehicleId: number
    clientId: number
    startDate: string
    endDate: string
    dailyPrice: number
    amountPaid?: number
    status: string
    notes?: string | null
    source?: string
  }) {
    await this.assertNoConflict(payload.vehicleId, payload.startDate, payload.endDate)

    const status =
      payload.status === 'Annulée' || payload.status === 'En attente'
        ? payload.status
        : resolveRentalStatus(payload.startDate, payload.endDate)

    const rental = await Rental.create({
      agencyId: payload.agencyId,
      vehicleId: payload.vehicleId,
      clientId: payload.clientId,
      startDate: DateTime.fromISO(payload.startDate),
      endDate: DateTime.fromISO(payload.endDate),
      dailyPrice: payload.dailyPrice,
      amountPaid: payload.amountPaid ?? 0,
      status,
      notes: payload.notes ?? null,
      source: payload.source ?? 'agency',
    })

    await this.syncVehicleStatus(rental.vehicleId)
    await this.upsertInvoiceForRental(rental)

    await rental.load('vehicle')
    const label = rental.vehicle?.label ?? `Véhicule #${rental.vehicleId}`
    await this.#notifyRental(
      rental.vehicleId,
      OWNER_NOTIFICATION_TYPES.RENTAL_CREATED,
      'Nouvelle location',
      `${label} est réservé du ${payload.startDate} au ${payload.endDate}.`,
      { rentalId: rental.id }
    )

    return rental
  }

  async update(
    rental: Rental,
    payload: Partial<{
      vehicleId: number
      clientId: number
      startDate: string
      endDate: string
      dailyPrice: number
      amountPaid: number
      status: string
      notes: string | null
      cancelReason: string | null
      cancelledBy: string | null
    }>
  ) {
    const previousVehicleId = rental.vehicleId
    const previousStart = rental.startDate.toISODate()!
    const previousEnd = rental.endDate.toISODate()!
    const previousStatus = rental.status
    const vehicleId = payload.vehicleId ?? rental.vehicleId
    const startDate = payload.startDate ?? rental.startDate.toISODate()!
    const endDate = payload.endDate ?? rental.endDate.toISODate()!

    if (payload.status !== 'Annulée') {
      await this.assertNoConflict(vehicleId, startDate, endDate, rental.id)
    }

    const requested = payload.status ?? rental.status
    let status: string
    if (requested === 'Annulée') {
      status = 'Annulée'
    } else if (requested === 'En attente') {
      status = 'En attente'
    } else if (rental.status === 'En attente' && payload.status === undefined) {
      status = 'En attente'
    } else {
      status = resolveRentalStatus(startDate, endDate)
    }

    rental.merge({
      vehicleId,
      clientId: payload.clientId ?? rental.clientId,
      startDate: DateTime.fromISO(startDate),
      endDate: DateTime.fromISO(endDate),
      dailyPrice: payload.dailyPrice ?? rental.dailyPrice,
      status,
      notes: payload.notes === undefined ? rental.notes : payload.notes,
      cancelReason:
        status === 'Annulée'
          ? (payload.cancelReason ?? rental.cancelReason)
          : rental.cancelReason,
      cancelledAt: status === 'Annulée' ? (rental.cancelledAt ?? DateTime.now()) : null,
      cancelledBy:
        status === 'Annulée' ? (payload.cancelledBy ?? rental.cancelledBy ?? 'agency') : null,
    })
    await rental.save()

    await this.syncVehicleStatus(rental.vehicleId)
    if (previousVehicleId !== rental.vehicleId) {
      await this.syncVehicleStatus(previousVehicleId)
    }
    await this.upsertInvoiceForRental(rental)

    await rental.load('vehicle')
    const label = rental.vehicle?.label ?? `Véhicule #${rental.vehicleId}`
    const datesChanged = startDate !== previousStart || endDate !== previousEnd
    const vehicleChanged = previousVehicleId !== rental.vehicleId
    const cancelled = status === 'Annulée' && previousStatus !== 'Annulée'

    if (cancelled) {
      await this.#notifyRental(
        rental.vehicleId,
        OWNER_NOTIFICATION_TYPES.RENTAL_CANCELLED,
        'Location annulée',
        `La location de ${label} (${previousStart} → ${previousEnd}) a été annulée.`,
        { rentalId: rental.id }
      )
      if (vehicleChanged) {
        await this.#notifyRental(
          previousVehicleId,
          OWNER_NOTIFICATION_TYPES.RENTAL_CANCELLED,
          'Location annulée',
          `Une location sur votre véhicule a été annulée.`,
          { rentalId: rental.id }
        )
      }
    } else if (datesChanged || vehicleChanged) {
      await this.#notifyRental(
        rental.vehicleId,
        OWNER_NOTIFICATION_TYPES.RENTAL_UPDATED,
        'Location modifiée',
        vehicleChanged
          ? `${label} est désormais réservé du ${startDate} au ${endDate}.`
          : `Les dates de location de ${label} ont changé : ${startDate} → ${endDate}.`,
        { rentalId: rental.id }
      )
      if (vehicleChanged) {
        await this.#notifyRental(
          previousVehicleId,
          OWNER_NOTIFICATION_TYPES.RENTAL_UPDATED,
          'Location retirée',
          `Une location a été réaffectée vers un autre véhicule.`,
          { rentalId: rental.id }
        )
      }
    }

    return rental
  }

  async cancel(
    rental: Rental,
    options?: { reason?: string | null; cancelledBy?: string }
  ) {
    const previousStart = rental.startDate.toISODate()!
    const previousEnd = rental.endDate.toISODate()!
    rental.status = 'Annulée'
    rental.cancelReason = options?.reason?.trim() || rental.cancelReason
    rental.cancelledAt = DateTime.now()
    rental.cancelledBy = options?.cancelledBy ?? 'agency'
    await rental.save()
    await this.syncVehicleStatus(rental.vehicleId)
    await this.upsertInvoiceForRental(rental)

    await rental.load('vehicle')
    const label = rental.vehicle?.label ?? `Véhicule #${rental.vehicleId}`
    await this.#notifyRental(
      rental.vehicleId,
      OWNER_NOTIFICATION_TYPES.RENTAL_CANCELLED,
      'Location annulée',
      `La location de ${label} (${previousStart} → ${previousEnd}) a été annulée.`,
      { rentalId: rental.id }
    )

    return rental
  }

  /**
   * Prolonge une location : nouvelle date de fin + historique traçable + sync facture.
   */
  async extend(
    rental: Rental,
    payload: {
      newEndDate: string
      dailyPrice?: number
      notes?: string | null
      createdByUserId?: number | null
    }
  ) {
    if (rental.status !== 'En cours') {
      throw new Exception('Seules les locations en cours peuvent être prolongées.', {
        status: 422,
        code: 'E_EXTENSION_STATUS',
      })
    }

    const startDate = rental.startDate.toISODate()!
    const previousEndDate = rental.endDate.toISODate()!
    const newEndDate = payload.newEndDate

    if (newEndDate <= previousEndDate) {
      throw new Exception('La nouvelle date de fin doit être postérieure à la fin actuelle.', {
        status: 422,
        code: 'E_EXTENSION_DATE',
      })
    }

    const oldDays = daysBetween(startDate, previousEndDate)
    const newDays = daysBetween(startDate, newEndDate)
    const addedDays = newDays - oldDays
    if (addedDays < 1) {
      throw new Exception('La prolongation doit ajouter au moins un jour.', {
        status: 422,
        code: 'E_EXTENSION_DAYS',
      })
    }

    await this.assertNoConflict(rental.vehicleId, startDate, newEndDate, rental.id)

    const dailyPrice = payload.dailyPrice ?? rental.dailyPrice
    const amountHt = dailyPrice * addedDays

    const RentalExtension = (await import('#models/rental_extension')).default
    const extension = await RentalExtension.create({
      rentalId: rental.id,
      previousEndDate: DateTime.fromISO(previousEndDate),
      newEndDate: DateTime.fromISO(newEndDate),
      addedDays,
      dailyPrice,
      amountHt,
      notes: payload.notes?.trim() || null,
      createdByUserId: payload.createdByUserId ?? null,
    })

    rental.endDate = DateTime.fromISO(newEndDate)
    rental.status = resolveRentalStatus(startDate, newEndDate)
    await rental.save()

    await this.syncVehicleStatus(rental.vehicleId)
    await this.upsertInvoiceForRental(rental)

    await rental.load('vehicle')
    const label = rental.vehicle?.label ?? `Véhicule #${rental.vehicleId}`
    await this.#notifyRental(
      rental.vehicleId,
      OWNER_NOTIFICATION_TYPES.RENTAL_EXTENDED,
      'Location prolongée',
      `${label} : fin reportée au ${newEndDate} (+${addedDays} jour${addedDays > 1 ? 's' : ''}).`,
      { rentalId: rental.id, extensionId: extension.id, addedDays }
    )

    return { rental, extension }
  }


  /**
   * Confirme une demande marketplace (En attente → statut calendaire).
   */
  async approveMarketplaceRequest(rental: Rental) {
    if (rental.status !== 'En attente') {
      throw new Exception('Seules les demandes en attente peuvent être validées.', {
        status: 422,
        code: 'E_APPROVE_STATUS',
      })
    }

    const startDate = rental.startDate.toISODate()!
    const endDate = rental.endDate.toISODate()!
    await this.assertNoConflict(rental.vehicleId, startDate, endDate, rental.id)

    const status = resolveRentalStatus(startDate, endDate)
    rental.status = status
    await rental.save()

    // Rattacher le client web au portefeuille agence si besoin
    await rental.load('client')
    if (rental.client && !rental.client.agencyId) {
      rental.client.agencyId = rental.agencyId
      await rental.client.save()
    }

    await this.syncVehicleStatus(rental.vehicleId)
    await this.upsertInvoiceForRental(rental)

    await rental.load('vehicle')
    const label = rental.vehicle?.label ?? `Véhicule #${rental.vehicleId}`
    await this.#notifyRental(
      rental.vehicleId,
      OWNER_NOTIFICATION_TYPES.RENTAL_CREATED,
      'Réservation confirmée',
      `${label} est confirmé du ${startDate} au ${endDate}.`,
      { rentalId: rental.id, source: rental.source }
    )

    await this.#notifyMarketplaceClientDecision(rental, 'approved')

    return rental
  }

  /**
   * Refuse une demande marketplace (En attente → Annulée).
   */
  async rejectMarketplaceRequest(rental: Rental, reason?: string | null) {
    if (rental.status !== 'En attente') {
      throw new Exception('Seules les demandes en attente peuvent être refusées.', {
        status: 422,
        code: 'E_REJECT_STATUS',
      })
    }

    const cancelled = await this.cancel(rental, {
      reason: reason?.trim() || 'Demande refusée par l’agence',
      cancelledBy: 'agency',
    })

    await this.#notifyMarketplaceClientDecision(
      cancelled,
      'rejected',
      reason?.trim() || 'Demande refusée par l’agence'
    )

    return cancelled
  }

  /**
   * Recalcule les statuts des locations actives selon les dates du jour.
   */
  async syncStatusesFromDates(today: string = todayISO()) {
    const rentals = await Rental.query().whereNotIn('status', ['Annulée', 'En attente'])
    let updated = 0

    for (const rental of rentals) {
      const startDate = rental.startDate.toISODate()!
      const endDate = rental.endDate.toISODate()!
      const nextStatus = resolveRentalStatus(startDate, endDate, today)
      if (rental.status === nextStatus) continue

      rental.status = nextStatus
      await rental.save()
      await this.syncVehicleStatus(rental.vehicleId)
      await this.upsertInvoiceForRental(rental)
      updated++
    }

    return updated
  }
}

export { daysBetween }
