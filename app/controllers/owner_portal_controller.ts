import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import Vehicle from '#models/vehicle'
import Rental from '#models/rental'
import Maintenance from '#models/maintenance'
import Setting from '#models/setting'
import { rentalFinancials, todayISO } from '#services/finance_service'
import { scopeAppliedExpenses } from '#services/maintenance_expense_service'
import VehicleSummaryService from '#services/vehicle_summary_service'
import OwnerNotificationService from '#services/owner_notification_service'
import VehicleTransformer from '#transformers/vehicle_transformer'
import RentalTransformer from '#transformers/rental_transformer'
import OwnerNotificationTransformer from '#transformers/owner_notification_transformer'

type VehicleMoneyRow = {
  vehicleId: number
  label: string
  plate: string
  netTotal: number
  expenses: number
  balance: number
  days: number
  rentalCount: number
  maintenanceCount: number
}

export default class OwnerPortalController {
  #ownerId(auth: HttpContext['auth']) {
    const user = auth.use('api').getUserOrFail()
    if (!user.owner) {
      throw new Exception('Profil propriétaire introuvable.', { status: 403, code: 'E_OWNER_MISSING' })
    }
    return user.owner.id
  }

  #notifications() {
    return new OwnerNotificationService()
  }

  async dashboard({ auth, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const user = auth.use('api').getUserOrFail()
    const settingsAgencyId = user.agencyId ?? user.owner?.agencyId
    if (!settingsAgencyId) {
      throw new Exception('Aucune agence associée à ce compte.', {
        status: 403,
        code: 'E_NO_AGENCY',
      })
    }
    const settings = await Setting.current(settingsAgencyId)
    const vehicles = await Vehicle.query().where('ownerId', ownerId)
    const vehicleIds = vehicles.map((v) => v.id)

    const rentals =
      vehicleIds.length === 0
        ? []
        : await Rental.query()
            .whereIn('vehicleId', vehicleIds)
            .whereNot('status', 'Annulée')
            .preload('vehicle')

    const maintenances =
      vehicleIds.length === 0
        ? []
        : await scopeAppliedExpenses(
            Maintenance.query().whereIn('vehicleId', vehicleIds)
          )

    let netRevenue = 0
    let daysRented = 0
    const today = todayISO()
    let activeRentals = 0

    for (const rental of rentals) {
      const finance = await rentalFinancials(rental, settings.commissionPerDay)
      netRevenue += finance.netTotal
      daysRented += finance.days
      if (
        rental.status === 'En cours' &&
        rental.startDate.toISODate()! <= today &&
        rental.endDate.toISODate()! >= today
      ) {
        activeRentals += 1
      }
    }

    const totalExpenses = maintenances.reduce((sum, row) => sum + Number(row.cost || 0), 0)

    return serialize({
      kpis: {
        vehicleCount: vehicles.length,
        availableCount: vehicles.filter((v) => v.status === 'Disponible').length,
        activeRentals,
        daysRented,
        netRevenue,
        totalExpenses,
        balance: netRevenue - totalExpenses,
      },
      companyName: settings.companyName,
    })
  }

  async vehicles({ auth, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const vehicles = await Vehicle.query().where('ownerId', ownerId).orderBy('id', 'desc')
    return serialize(VehicleTransformer.transform(vehicles).useVariant('ownerView'))
  }

  async vehicle({ auth, params, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .where('ownerId', ownerId)
      .firstOrFail()
    return serialize(VehicleTransformer.transform(vehicle).useVariant('ownerView'))
  }

  /**
   * Synthèse complète d’un véhicule du propriétaire.
   */
  async vehicleSummary({ auth, params, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .where('ownerId', ownerId)
      .preload('owner', (q) => q.preload('user'))
      .firstOrFail()

    const summary = await new VehicleSummaryService().build(vehicle, { ownerView: true })
    return serialize(summary)
  }

  /**
   * Toutes les dépenses d’entretien d’un véhicule du propriétaire.
   */
  async vehicleExpenses({ auth, params, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const vehicle = await Vehicle.query()
      .where('id', params.id)
      .where('ownerId', ownerId)
      .firstOrFail()

    const rows = await scopeAppliedExpenses(
      Maintenance.query().where('vehicleId', vehicle.id)
    )
      .orderBy('performedOn', 'desc')
      .orderBy('id', 'desc')

    let totalExpenses = 0
    const expenses = rows.map((row) => {
      const cost = Number(row.cost || 0)
      totalExpenses += cost
      return {
        maintenanceId: row.id,
        vehicleId: row.vehicleId,
        type: row.type,
        performedOn: row.performedOn,
        cost,
        mileage: row.mileage,
        provider: row.provider,
        nextDueOn: row.nextDueOn,
        description: row.description,
      }
    })

    return serialize({
      vehicle: {
        id: vehicle.id,
        label: vehicle.label,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
      },
      totalExpenses,
      count: expenses.length,
      expenses,
    })
  }

  async rentals({ auth, request, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const user = auth.use('api').getUserOrFail()
    const settingsAgencyId = user.agencyId ?? user.owner?.agencyId
    if (!settingsAgencyId) {
      throw new Exception('Aucune agence associée à ce compte.', {
        status: 403,
        code: 'E_NO_AGENCY',
      })
    }
    const settings = await Setting.current(settingsAgencyId)
    const vehicleId = request.input('vehicleId')

    const vehicles = await Vehicle.query().where('ownerId', ownerId)
    const vehicleIds = vehicles.map((v) => v.id)
    if (vehicleIds.length === 0) return []

    const query = Rental.query()
      .whereIn('vehicleId', vehicleIds)
      .whereNot('status', 'Annulée')
      .preload('vehicle')
      .orderBy('startDate', 'desc')

    if (vehicleId) {
      if (!vehicleIds.includes(Number(vehicleId))) {
        throw new Exception('Véhicule non trouvé.', { status: 404, code: 'E_NOT_FOUND' })
      }
      query.where('vehicleId', vehicleId)
    }

    const rentals = await query
    const result = []
    for (const rental of rentals) {
      const finance = await rentalFinancials(rental, settings.commissionPerDay)
      const serialized = await serialize(RentalTransformer.transform(rental).useVariant('ownerView'))
      const base = (serialized as { data?: Record<string, unknown> }).data ?? serialized
      result.push({
        ...base,
        dailyPrice: finance.netDailyPrice,
        finance: {
          days: finance.days,
          netTotal: finance.netTotal,
          netDailyPrice: finance.netDailyPrice,
        },
      })
    }
    return result
  }

  async revenues({ auth, request, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const user = auth.use('api').getUserOrFail()
    const settingsAgencyId = user.agencyId ?? user.owner?.agencyId
    if (!settingsAgencyId) {
      throw new Exception('Aucune agence associée à ce compte.', {
        status: 403,
        code: 'E_NO_AGENCY',
      })
    }
    const settings = await Setting.current(settingsAgencyId)
    const filterVehicleId = request.input('vehicleId')
      ? Number(request.input('vehicleId'))
      : null

    let vehicles = await Vehicle.query().where('ownerId', ownerId)
    if (filterVehicleId) {
      vehicles = vehicles.filter((v) => v.id === filterVehicleId)
      if (vehicles.length === 0) {
        throw new Exception('Véhicule non trouvé.', { status: 404, code: 'E_NOT_FOUND' })
      }
    }
    const vehicleIds = vehicles.map((v) => v.id)

    const byVehicle = new Map<number, VehicleMoneyRow>()
    for (const vehicle of vehicles) {
      byVehicle.set(vehicle.id, {
        vehicleId: vehicle.id,
        label: vehicle.label,
        plate: vehicle.plate,
        netTotal: 0,
        expenses: 0,
        balance: 0,
        days: 0,
        rentalCount: 0,
        maintenanceCount: 0,
      })
    }

    const rentals =
      vehicleIds.length === 0
        ? []
        : await Rental.query()
            .whereIn('vehicleId', vehicleIds)
            .whereNot('status', 'Annulée')
            .preload('vehicle')
            .orderBy('startDate', 'desc')

    const maintenances =
      vehicleIds.length === 0
        ? []
        : await scopeAppliedExpenses(
            Maintenance.query().whereIn('vehicleId', vehicleIds).preload('vehicle')
          ).orderBy('performedOn', 'desc')

    let totalNet = 0
    const lines = []

    for (const rental of rentals) {
      const finance = await rentalFinancials(rental, settings.commissionPerDay)
      totalNet += finance.netTotal
      lines.push({
        rentalId: rental.id,
        vehicleId: rental.vehicleId,
        label: rental.vehicle?.label ?? null,
        plate: rental.vehicle?.plate ?? null,
        startDate: rental.startDate,
        endDate: rental.endDate,
        status: rental.status,
        days: finance.days,
        netTotal: finance.netTotal,
        netDailyPrice: finance.netDailyPrice,
      })

      const current = byVehicle.get(rental.vehicleId)
      if (current) {
        current.netTotal += finance.netTotal
        current.days += finance.days
        current.rentalCount += 1
      }
    }

    let totalExpenses = 0
    const expenses = []

    for (const row of maintenances) {
      const cost = Number(row.cost || 0)
      totalExpenses += cost
      expenses.push({
        maintenanceId: row.id,
        vehicleId: row.vehicleId,
        label: row.vehicle?.label ?? null,
        plate: row.vehicle?.plate ?? null,
        type: row.type,
        performedOn: row.performedOn,
        cost,
        description: row.description,
      })

      const current = byVehicle.get(row.vehicleId)
      if (current) {
        current.expenses += cost
        current.maintenanceCount += 1
      }
    }

    for (const row of byVehicle.values()) {
      row.balance = row.netTotal - row.expenses
    }

    return serialize({
      totalNet,
      totalExpenses,
      balance: totalNet - totalExpenses,
      byVehicle: [...byVehicle.values()],
      lines,
      expenses,
    })
  }

  async notifications({ auth, request, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const unreadOnly = request.input('unreadOnly') === 'true' || request.input('unreadOnly') === true
    const limit = Math.min(Number(request.input('limit')) || 50, 100)
    const rows = await this.#notifications().listForOwner(ownerId, { unreadOnly, limit })
    return serialize(OwnerNotificationTransformer.transform(rows))
  }

  async notificationsUnreadCount({ auth, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const unreadCount = await this.#notifications().unreadCount(ownerId)
    return serialize({ unreadCount })
  }

  async markNotificationRead({ auth, params, serialize }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    const row = await this.#notifications().markRead(ownerId, Number(params.id))
    return serialize(OwnerNotificationTransformer.transform(row))
  }

  async markAllNotificationsRead({ auth, response }: HttpContext) {
    const ownerId = this.#ownerId(auth)
    await this.#notifications().markAllRead(ownerId)
    return response.ok({ message: 'Toutes les notifications ont été marquées comme lues.' })
  }
}
