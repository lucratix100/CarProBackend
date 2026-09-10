import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Agency from '#models/agency'
import City from '#models/city'
import Client from '#models/client'
import Marque from '#models/marque'
import Modele from '#models/modele'
import Owner from '#models/owner'
import Setting from '#models/setting'
import User from '#models/user'
import Vehicle from '#models/vehicle'
import { CURRENT_TERMS_VERSION } from '#constants/mandate_terms'
import type { VehicleType } from '#constants/vehicle_types'
import { attachVehiclePhotos } from '../utils/attach_vehicle_photos.js'

async function resolveModele(marqueName: string, modeleName: string) {
  const marque = await Marque.findByOrFail('name', marqueName)
  const modele = await Modele.query()
    .where('marqueId', marque.id)
    .where('name', modeleName)
    .firstOrFail()
  return { marque, modele }
}

async function findCity(name: string, region: string) {
  return City.query().where('name', name).where('region', region).firstOrFail()
}

async function ensureAgency(input: {
  name: string
  slug: string
  cityId: number
  notes?: string
  isVerified?: boolean
  publishOnMarketplace?: boolean
}) {
  let agency = await Agency.findBy('slug', input.slug)
  if (!agency) {
    agency = await Agency.create({
      name: input.name,
      slug: input.slug,
      isActive: true,
      isVerified: input.isVerified ?? true,
      cityId: input.cityId,
      publishOnMarketplace: input.publishOnMarketplace ?? true,
      notes: input.notes ?? null,
    })
  } else {
    agency.cityId = input.cityId
    agency.isActive = true
    agency.isVerified = input.isVerified ?? agency.isVerified
    agency.publishOnMarketplace = input.publishOnMarketplace ?? agency.publishOnMarketplace
    if (input.notes) agency.notes = input.notes
    await agency.save()
  }

  await Setting.current(agency.id)
  return agency
}

async function ensureAdmin(agency: Agency, email: string, fullName: string, password: string) {
  let user = await User.findBy('email', email)
  if (!user) {
    user = await User.create({
      fullName,
      email,
      password,
      role: 'admin',
      status: 'active',
      agencyId: agency.id,
      passwordSetAt: DateTime.now(),
      invitationToken: null,
      invitationExpiresAt: null,
      termsVersion: null,
      termsAcceptedAt: null,
      termsAcceptedIp: null,
    })
  } else if (!user.agencyId) {
    user.agencyId = agency.id
    await user.save()
  }
  return user
}

async function ensureOwner(
  agency: Agency,
  input: { email: string; fullName: string; phone: string; city: string; password: string }
) {
  let user = await User.findBy('email', input.email)
  if (!user) {
    user = await User.create({
      fullName: input.fullName,
      email: input.email,
      password: input.password,
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
  } else if (!user.agencyId) {
    user.agencyId = agency.id
    await user.save()
  }

  let owner = await Owner.findBy('userId', user.id)
  if (!owner) {
    owner = await Owner.create({
      agencyId: agency.id,
      userId: user.id,
      phone: input.phone,
      city: input.city,
      notes: 'Propriétaire seed marketplace',
      isActive: true,
    })
  } else if (!owner.agencyId) {
    owner.agencyId = agency.id
    await owner.save()
  }

  return owner
}

type VehicleSeed = {
  plate: string
  marque: string
  modele: string
  year: number
  color: string
  fuel: string
  vehicleType: VehicleType
  status: string
  mileage: number
  dailyPrice: number
  insuranceCompany: string
  notes?: string
  ownerId?: number | null
}

async function ensureVehicle(agency: Agency, data: VehicleSeed) {
  const { marque, modele } = await resolveModele(data.marque, data.modele)
  let vehicle = await Vehicle.query().where('plate', data.plate).where('agencyId', agency.id).first()

  if (!vehicle) {
    vehicle = await Vehicle.create({
      agencyId: agency.id,
      ownerId: data.ownerId ?? null,
      marqueId: marque.id,
      modeleId: modele.id,
      brand: marque.name,
      model: modele.name,
      plate: data.plate,
      year: data.year,
      color: data.color,
      fuel: data.fuel,
      vehicleType: data.vehicleType,
      status: data.status,
      mileage: data.mileage,
      dailyPrice: data.dailyPrice,
      insuranceCompany: data.insuranceCompany,
      insuranceExpiresAt: DateTime.now().plus({ months: 8 }),
      technicalVisitAt: DateTime.now().plus({ months: 5 }),
      photoUrl: null,
      notes: data.notes ?? null,
      complianceHold: false,
    })
  } else {
    vehicle.vehicleType = data.vehicleType
    vehicle.status = data.status
    vehicle.dailyPrice = data.dailyPrice
    vehicle.color = data.color
    vehicle.fuel = data.fuel
    vehicle.mileage = data.mileage
    if (data.ownerId !== undefined) vehicle.ownerId = data.ownerId
    await vehicle.save()
  }

  await attachVehiclePhotos(vehicle, 4)
  return vehicle
}

export default class extends BaseSeeder {
  async run() {
    const dakar = await findCity('Dakar', 'Dakar')
    const mbour = await findCity('Mbour', 'Thiès')
    const saintLouis = await findCity('Saint-Louis', 'Saint-Louis')
    const thies = await findCity('Thiès', 'Thiès')

    // —— Agence PCS (existante) : marketplace + ville ——
    const pcs = await Agency.findByOrFail('slug', 'pcs')
    pcs.cityId = dakar.id
    pcs.isActive = true
    pcs.isVerified = true
    pcs.publishOnMarketplace = true
    pcs.notes = 'Agence démo principale — marketplace'
    await pcs.save()
    await Setting.current(pcs.id)

    // Photos + types sur les véhicules démo PCS (sans écraser un statut Loué)
    const pcsCorolla = await Vehicle.query().where('plate', 'DK-1234-AB').first()
    if (pcsCorolla) {
      pcsCorolla.vehicleType = 'Berline'
      await pcsCorolla.save()
      await attachVehiclePhotos(pcsCorolla, 4)
    }

    const pcsTucson = await Vehicle.query().where('plate', 'DK-5678-CD').first()
    if (pcsTucson) {
      pcsTucson.vehicleType = 'SUV'
      await pcsTucson.save()
      await attachVehiclePhotos(pcsTucson, 4)
    }

    const pcsOwner = await Owner.query().where('agencyId', pcs.id).first()

    // Flotte supplémentaire PCS
    await ensureVehicle(pcs, {
      plate: 'DK-9012-EF',
      marque: 'Toyota',
      modele: 'Hilux',
      year: 2023,
      color: 'Gris',
      fuel: 'Diesel',
      vehicleType: 'Pick-up',
      status: 'Disponible',
      mileage: 18500,
      dailyPrice: 65000,
      insuranceCompany: 'NSIA',
      notes: 'Pick-up flotte agence',
      ownerId: null,
    })

    await ensureVehicle(pcs, {
      plate: 'DK-3456-GH',
      marque: 'Peugeot',
      modele: '208',
      year: 2024,
      color: 'Rouge',
      fuel: 'Essence',
      vehicleType: 'Citadine',
      status: 'Disponible',
      mileage: 8200,
      dailyPrice: 28000,
      insuranceCompany: 'AXA',
      notes: 'Citadine économique',
      ownerId: pcsOwner?.id ?? null,
    })

    await ensureVehicle(pcs, {
      plate: 'DK-7890-IJ',
      marque: 'Mercedes',
      modele: 'Classe E',
      year: 2022,
      color: 'Noir',
      fuel: 'Hybride',
      vehicleType: 'Berline',
      status: 'Disponible',
      mileage: 32000,
      dailyPrice: 95000,
      insuranceCompany: 'Allianz',
      notes: 'Berline premium',
      ownerId: pcsOwner?.id ?? null,
    })

    // —— Agence Saly / Mbour ——
    const saly = await ensureAgency({
      name: 'Saly Drive Location',
      slug: 'saly-drive',
      cityId: mbour.id,
      notes: 'Agence côte Petite Côte',
      isVerified: true,
      publishOnMarketplace: true,
    })
    await ensureAdmin(saly, 'admin@salydrive.sn', 'Admin Saly Drive', 'admin123')
    const salyOwner = await ensureOwner(saly, {
      email: 'owner@salydrive.sn',
      fullName: 'Ibrahima Ndiaye',
      phone: '+221770000011',
      city: 'Mbour',
      password: 'owner123',
    })

    await ensureVehicle(saly, {
      plate: 'TH-1001-AA',
      marque: 'Renault',
      modele: 'Duster',
      year: 2023,
      color: 'Blanc',
      fuel: 'Essence',
      vehicleType: 'SUV',
      status: 'Disponible',
      mileage: 22100,
      dailyPrice: 45000,
      insuranceCompany: 'NSIA',
      ownerId: salyOwner.id,
    })

    await ensureVehicle(saly, {
      plate: 'TH-1002-BB',
      marque: 'Kia',
      modele: 'Sportage',
      year: 2024,
      color: 'Bleu',
      fuel: 'Hybride',
      vehicleType: 'SUV',
      status: 'Disponible',
      mileage: 9400,
      dailyPrice: 52000,
      insuranceCompany: 'AXA',
      ownerId: salyOwner.id,
    })

    await ensureVehicle(saly, {
      plate: 'TH-1003-CC',
      marque: 'Toyota',
      modele: 'Yaris',
      year: 2021,
      color: 'Gris',
      fuel: 'Essence',
      vehicleType: 'Citadine',
      status: 'Loué',
      mileage: 47800,
      dailyPrice: 25000,
      insuranceCompany: 'NSIA',
      ownerId: null,
    })

    if (!(await Client.query().where('phone', '+221770000211').first())) {
      await Client.create({
        agencyId: saly.id,
        fullName: 'Awa Ba',
        phone: '+221770000211',
        email: 'awa.ba@example.com',
        licenseNumber: 'SN-LIC-2110',
        licenseExpiresAt: DateTime.now().plus({ years: 3 }),
        idCardNumber: 'SN-CNI-211001',
        city: 'Mbour',
        birthDate: DateTime.fromISO('1988-09-03'),
        type: 'particulier',
        notes: 'Cliente seed Saly',
      })
    }

    // —— Agence Saint-Louis ——
    const nord = await ensureAgency({
      name: 'Nord Auto Location',
      slug: 'nord-auto',
      cityId: saintLouis.id,
      notes: 'Agence Saint-Louis',
      isVerified: true,
      publishOnMarketplace: true,
    })
    await ensureAdmin(nord, 'admin@nordauto.sn', 'Admin Nord Auto', 'admin123')
    const nordOwner = await ensureOwner(nord, {
      email: 'owner@nordauto.sn',
      fullName: 'Moussa Fall',
      phone: '+221770000022',
      city: 'Saint-Louis',
      password: 'owner123',
    })

    await ensureVehicle(nord, {
      plate: 'SL-2001-DD',
      marque: 'Mitsubishi',
      modele: 'Pajero',
      year: 2020,
      color: 'Vert',
      fuel: 'Diesel',
      vehicleType: '4x4',
      status: 'Disponible',
      mileage: 68500,
      dailyPrice: 70000,
      insuranceCompany: 'Allianz',
      notes: '4x4 tout-terrain',
      ownerId: nordOwner.id,
    })

    await ensureVehicle(nord, {
      plate: 'SL-2002-EE',
      marque: 'Hyundai',
      modele: 'Accent',
      year: 2022,
      color: 'Blanc',
      fuel: 'Essence',
      vehicleType: 'Berline',
      status: 'Disponible',
      mileage: 30100,
      dailyPrice: 30000,
      insuranceCompany: 'NSIA',
      ownerId: null,
    })

    // —— Agence Thiès (non vérifiée, pour tester le badge) ——
    const thiesAgency = await ensureAgency({
      name: 'Thiès Express Cars',
      slug: 'thies-express',
      cityId: thies.id,
      notes: 'Agence en cours de vérification',
      isVerified: false,
      publishOnMarketplace: true,
    })
    await ensureAdmin(thiesAgency, 'admin@thiesexpress.sn', 'Admin Thiès Express', 'admin123')

    await ensureVehicle(thiesAgency, {
      plate: 'TH-3001-FF',
      marque: 'Dacia',
      modele: 'Sandero',
      year: 2023,
      color: 'Orange',
      fuel: 'Essence',
      vehicleType: 'Citadine',
      status: 'Disponible',
      mileage: 15200,
      dailyPrice: 22000,
      insuranceCompany: 'AXA',
      ownerId: null,
    })

    await ensureVehicle(thiesAgency, {
      plate: 'TH-3002-GG',
      marque: 'Ford',
      modele: 'Ranger',
      year: 2021,
      color: 'Noir',
      fuel: 'Diesel',
      vehicleType: 'Pick-up',
      status: 'Entretien',
      mileage: 54000,
      dailyPrice: 58000,
      insuranceCompany: 'NSIA',
      notes: 'En entretien — visible hors catalogue Disponible',
      ownerId: null,
    })

    // Rafraîchir les photos de toute la flotte des agences seed (ex. véhicule créé hors seed)
    const seededAgencyIds = [pcs.id, saly.id, nord.id, thiesAgency.id]
    const fleet = await Vehicle.query().whereIn('agencyId', seededAgencyIds)
    for (const vehicle of fleet) {
      await attachVehiclePhotos(vehicle, 4, { replaceExisting: true })
    }
  }
}
