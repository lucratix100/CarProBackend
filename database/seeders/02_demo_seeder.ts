import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import User from '#models/user'
import Owner from '#models/owner'
import Vehicle from '#models/vehicle'
import Client from '#models/client'
import Agency from '#models/agency'
import Setting from '#models/setting'
import RentalService from '#services/rental_service'
import Maintenance from '#models/maintenance'
import Marque from '#models/marque'
import Modele from '#models/modele'
import { CURRENT_TERMS_VERSION } from '#constants/mandate_terms'
import { attachVehiclePhotos } from '../utils/attach_vehicle_photos.js'

async function resolveModele(marqueName: string, modeleName: string) {
  const marque = await Marque.findByOrFail('name', marqueName)
  const modele = await Modele.query()
    .where('marqueId', marque.id)
    .where('name', modeleName)
    .firstOrFail()
  return { marque, modele }
}

export default class extends BaseSeeder {
  async run() {
    const agency = await Agency.findByOrFail('slug', 'pcs')
    await Setting.current(agency.id)

    let ownerUser = await User.findBy('email', 'owner@pcs.sn')
    if (!ownerUser) {
      ownerUser = await User.create({
        fullName: 'Amadou Diallo',
        email: 'owner@pcs.sn',
        password: 'owner123',
        role: 'owner',
        status: 'active',
        agencyId: agency.id,
        passwordSetAt: DateTime.now(),
        invitationToken: null,
        invitationExpiresAt: null,
        termsVersion: CURRENT_TERMS_VERSION,
        termsAcceptedAt: DateTime.now(),
        termsAcceptedIp: '127.0.0.1',
      })
    } else if (!ownerUser.agencyId) {
      ownerUser.agencyId = agency.id
      await ownerUser.save()
    }

    let owner = await Owner.findBy('userId', ownerUser.id)
    if (!owner) {
      owner = await Owner.create({
        agencyId: agency.id,
        userId: ownerUser.id,
        phone: '+221770000001',
        city: 'Dakar',
        notes: 'Propriétaire démo',
        isActive: true,
      })
    } else if (!owner.agencyId) {
      owner.agencyId = agency.id
      await owner.save()
    }

    const corolla = await resolveModele('Toyota', 'Corolla')
    const tucson = await resolveModele('Hyundai', 'Tucson')

    let vehicle = await Vehicle.query().where('plate', 'DK-1234-AB').first()
    if (!vehicle) {
      vehicle = await Vehicle.create({
        agencyId: agency.id,
        ownerId: owner.id,
        marqueId: corolla.marque.id,
        modeleId: corolla.modele.id,
        brand: corolla.marque.name,
        model: corolla.modele.name,
        plate: 'DK-1234-AB',
        year: 2022,
        color: 'Blanc',
        fuel: 'Essence',
        vehicleType: 'Berline',
        status: 'Disponible',
        mileage: 24500,
        dailyPrice: 35000,
        insuranceCompany: 'NSIA',
        insuranceExpiresAt: DateTime.now().plus({ months: 6 }),
        technicalVisitAt: DateTime.now().plus({ months: 3 }),
        photoUrl: null,
        notes: 'Véhicule démo',
      })
    } else {
      if (!vehicle.agencyId) {
        vehicle.agencyId = agency.id
      }
      if (!vehicle.marqueId || !vehicle.modeleId) {
        vehicle.marqueId = corolla.marque.id
        vehicle.modeleId = corolla.modele.id
        vehicle.brand = corolla.marque.name
        vehicle.model = corolla.modele.name
      }
      vehicle.vehicleType = vehicle.vehicleType || 'Berline'
      await vehicle.save()
    }
    await attachVehiclePhotos(vehicle, 4)

    let vehicle2 = await Vehicle.query().where('plate', 'DK-5678-CD').first()
    if (!vehicle2) {
      vehicle2 = await Vehicle.create({
        agencyId: agency.id,
        ownerId: owner.id,
        marqueId: tucson.marque.id,
        modeleId: tucson.modele.id,
        brand: tucson.marque.name,
        model: tucson.modele.name,
        plate: 'DK-5678-CD',
        year: 2021,
        color: 'Noir',
        fuel: 'Diesel',
        vehicleType: 'SUV',
        status: 'Disponible',
        mileage: 41200,
        dailyPrice: 55000,
        insuranceCompany: 'AXA',
        insuranceExpiresAt: DateTime.now().plus({ months: 4 }),
        technicalVisitAt: DateTime.now().plus({ months: 2 }),
        photoUrl: null,
        notes: null,
      })
    } else {
      if (!vehicle2.agencyId) {
        vehicle2.agencyId = agency.id
      }
      if (!vehicle2.marqueId || !vehicle2.modeleId) {
        vehicle2.marqueId = tucson.marque.id
        vehicle2.modeleId = tucson.modele.id
        vehicle2.brand = tucson.marque.name
        vehicle2.model = tucson.modele.name
      }
      vehicle2.vehicleType = vehicle2.vehicleType || 'SUV'
      await vehicle2.save()
    }
    await attachVehiclePhotos(vehicle2, 4)

    let client = await Client.query().where('phone', '+221770000099').first()
    if (!client) {
      client = await Client.create({
        agencyId: agency.id,
        fullName: 'Fatou Sarr',
        phone: '+221770000099',
        email: 'fatou.sarr@example.com',
        licenseNumber: 'SN-LIC-9988',
        licenseExpiresAt: DateTime.now().plus({ years: 2 }),
        idCardNumber: 'SN-CNI-123456',
        city: 'Dakar',
        birthDate: DateTime.fromISO('1990-05-12'),
        type: 'particulier',
        notes: 'Cliente démo',
      })
    } else if (!client.agencyId) {
      client.agencyId = agency.id
      await client.save()
    }

    const existingRental = await vehicle.related('rentals').query().first()
    if (!existingRental) {
      const rentalService = new RentalService()
      const start = DateTime.now().minus({ days: 2 }).toISODate()!
      const end = DateTime.now().plus({ days: 3 }).toISODate()!
      await rentalService.create({
        agencyId: agency.id,
        vehicleId: vehicle.id,
        clientId: client.id,
        startDate: start,
        endDate: end,
        dailyPrice: vehicle.dailyPrice,
        amountPaid: vehicle.dailyPrice * 2,
        status: 'En cours',
        notes: 'Location démo en cours',
      })
    }

    const existingMaint = await Maintenance.query().where('vehicleId', vehicle2.id).first()
    if (!existingMaint) {
      await Maintenance.create({
        vehicleId: vehicle2.id,
        type: 'Vidange',
        performedOn: DateTime.now().minus({ days: 40 }),
        cost: 45000,
        mileage: 40000,
        provider: 'Garage PCS',
        nextDueOn: DateTime.now().plus({ days: 10 }),
        alertDays: 15,
        description: 'Vidange + filtres',
      })
    }
  }
}
