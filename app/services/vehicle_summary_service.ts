import Vehicle from '#models/vehicle'
import Rental from '#models/rental'
import Maintenance from '#models/maintenance'
import VehicleExpense from '#models/vehicle_expense'
import Setting from '#models/setting'
import { rentalFinancials, todayISO } from '#services/finance_service'
import { isExpenseApplied, scopeAppliedExpenses } from '#services/maintenance_expense_service'

export type VehicleSummaryOptions = {
  /** Masquer commission / CA brut pour le portail owner */
  ownerView?: boolean
}

export default class VehicleSummaryService {
  async build(vehicle: Vehicle, options: VehicleSummaryOptions = {}) {
    const settings = await Setting.current(vehicle.agencyId)
    const today = todayISO()
    const isAgencyOwned = vehicle.ownerId === null

    const rentals = await Rental.query()
      .where('vehicleId', vehicle.id)
      .whereNot('status', 'Annulée')
      .preload('client')
      .orderBy('startDate', 'desc')

    const allMaintenances = await Maintenance.query()
      .where('vehicleId', vehicle.id)
      .whereNull('cancelledAt')
      .orderBy('performedOn', 'desc')
      .orderBy('id', 'desc')

    const appliedMaintenances = await scopeAppliedExpenses(
      Maintenance.query().where('vehicleId', vehicle.id)
    )
      .orderBy('performedOn', 'desc')
      .orderBy('id', 'desc')

    const vehicleExpenses = await VehicleExpense.query()
      .where('vehicleId', vehicle.id)
      .whereNull('cancelledAt')
      .orderBy('spentOn', 'desc')
      .orderBy('id', 'desc')

    let daysRented = 0
    let netRevenue = 0
    let grossRevenue = 0
    let activeRentals = 0
    const rentalLines = []

    for (const rental of rentals) {
      const finance = await rentalFinancials(rental, settings.commissionPerDay)
      daysRented += finance.days
      netRevenue += finance.netTotal
      grossRevenue += finance.grossTotal
      if (
        rental.status === 'En cours' &&
        rental.startDate.toISODate()! <= today &&
        rental.endDate.toISODate()! >= today
      ) {
        activeRentals += 1
      }

      rentalLines.push({
        rentalId: rental.id,
        startDate: rental.startDate,
        endDate: rental.endDate,
        status: rental.status,
        days: finance.days,
        netTotal: finance.netTotal,
        ...(options.ownerView
          ? {}
          : {
              grossTotal: finance.grossTotal,
              clientName: rental.client?.fullName ?? null,
            }),
      })
    }

    let maintenanceExpenses = 0
    const maintenanceLines = appliedMaintenances.map((row) => {
      const cost = Number(row.cost || 0)
      maintenanceExpenses += cost
      return {
        source: 'maintenance' as const,
        id: row.id,
        maintenanceId: row.id,
        type: row.type,
        spentOn: row.performedOn,
        performedOn: row.performedOn,
        cost,
        amount: cost,
        provider: row.provider,
        description: row.description,
        isApplied: true,
      }
    })

    let purchaseCost = 0
    let otherOperatingExpenses = 0
    const operatingExpenseLines = []

    for (const row of vehicleExpenses) {
      const amount = Number(row.amount || 0)
      const spentIso = row.spentOn?.toISODate?.() ?? null
      const applied = Boolean(spentIso && spentIso <= today)
      if (!applied) continue

      if (row.type === 'Achat') {
        purchaseCost += amount
      } else {
        otherOperatingExpenses += amount
      }

      operatingExpenseLines.push({
        source: 'vehicle_expense' as const,
        id: row.id,
        expenseId: row.id,
        type: row.type,
        spentOn: row.spentOn,
        performedOn: row.spentOn,
        cost: amount,
        amount,
        provider: row.provider,
        description: row.notes,
        isApplied: true,
      })
    }

    const expenseLines = [...operatingExpenseLines, ...maintenanceLines].sort((a, b) => {
      const da = a.spentOn?.toISODate?.() ?? ''
      const db = b.spentOn?.toISODate?.() ?? ''
      return db.localeCompare(da)
    })

    const totalExpenses = purchaseCost + otherOperatingExpenses + maintenanceExpenses
    /** Voiture agence : CA brut (tout revient à l’agence). Voiture owner : net après commission. */
    const revenueForBalance = isAgencyOwned ? grossRevenue : netRevenue
    const balance = revenueForBalance - totalExpenses

    const pendingExpenses = allMaintenances.filter((row) => !isExpenseApplied(row))
    const pendingExpenseTotal = pendingExpenses.reduce(
      (sum, row) => sum + Number(row.cost || 0),
      0
    )

    const pendingVehicleExpenses = vehicleExpenses.filter((row) => {
      const spentIso = row.spentOn?.toISODate?.() ?? null
      return Boolean(spentIso && spentIso > today)
    })
    const pendingVehicleExpenseTotal = pendingVehicleExpenses.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    )

    return {
      vehicle: {
        id: vehicle.id,
        label: vehicle.label,
        brand: vehicle.brand,
        model: vehicle.model,
        plate: vehicle.plate,
        status: vehicle.status,
        fuel: vehicle.fuel,
        vehicleType: vehicle.vehicleType,
        year: vehicle.year,
        color: vehicle.color,
        mileage: vehicle.mileage,
        dailyPrice: options.ownerView
          ? Math.max(0, vehicle.dailyPrice - settings.commissionPerDay)
          : vehicle.dailyPrice,
        insuranceCompany: vehicle.insuranceCompany,
        insuranceExpiresAt: vehicle.insuranceExpiresAt,
        technicalVisitAt: vehicle.technicalVisitAt,
        complianceHold: vehicle.complianceHold,
        insuranceAlertStage: vehicle.insuranceAlertStage,
        technicalVisitAlertStage: vehicle.technicalVisitAlertStage,
        notes: options.ownerView ? null : vehicle.notes,
        ownerId: vehicle.ownerId,
        ownership: isAgencyOwned ? ('agency' as const) : ('owner' as const),
        owner: vehicle.owner
          ? {
              id: vehicle.owner.id,
              fullName: vehicle.owner.user?.fullName ?? null,
              phone: vehicle.owner.phone,
            }
          : null,
      },
      kpis: {
        rentalCount: rentals.length,
        activeRentals,
        daysRented,
        netRevenue,
        ...(options.ownerView ? {} : { grossRevenue }),
        expenseCount: expenseLines.length,
        totalExpenses,
        purchaseCost: isAgencyOwned ? purchaseCost : 0,
        maintenanceExpenses,
        otherExpenses: otherOperatingExpenses,
        revenueForBalance,
        pendingExpenseCount: pendingExpenses.length + pendingVehicleExpenses.length,
        pendingExpenseTotal: pendingExpenseTotal + pendingVehicleExpenseTotal,
        balance,
        profitPositive: balance > 0,
        profitNegative: balance < 0,
      },
      rentals: rentalLines,
      expenses: expenseLines,
    }
  }
}
