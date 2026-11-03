import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Agency from '#models/agency'
import Marque from '#models/marque'
import Modele from '#models/modele'
import Setting from '#models/setting'
import Vehicle from '#models/vehicle'
import VehiclePhoto from '#models/vehicle_photo'

type SaleSeed = {
  plate: string
  brand: string
  model: string
  year: number
  color: string
  fuel: 'Essence' | 'Diesel' | 'Hybride'
  vehicleType: string
  mileage: number
  salePrice: number
  saleNegotiable: boolean
  photos: string[]
}

const SALES: SaleSeed[] = [
  {
    plate: 'DK-VENTE-01',
    brand: 'Toyota',
    model: 'Land Cruiser',
    year: 2021,
    color: 'Blanc',
    fuel: 'Diesel',
    vehicleType: '4x4',
    mileage: 48000,
    salePrice: 28500000,
    saleNegotiable: true,
    photos: [
      'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1400&q=70',
    ],
  },
  {
    plate: 'DK-VENTE-02',
    brand: 'Mercedes',
    model: 'GLE',
    year: 2020,
    color: 'Noir',
    fuel: 'Essence',
    vehicleType: 'SUV',
    mileage: 62000,
    salePrice: 32000000,
    saleNegotiable: true,
    photos: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=70',
    ],
  },
  {
    plate: 'DK-VENTE-03',
    brand: 'Hyundai',
    model: 'Tucson',
    year: 2022,
    color: 'Gris',
    fuel: 'Hybride',
    vehicleType: 'SUV',
    mileage: 27000,
    salePrice: 18500000,
    saleNegotiable: false,
    photos: [
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=70',
    ],
  },
  {
    plate: 'DK-VENTE-04',
    brand: 'Kia',
    model: 'Sportage',
    year: 2023,
    color: 'Rouge',
    fuel: 'Essence',
    vehicleType: 'SUV',
    mileage: 18000,
    salePrice: 16800000,
    saleNegotiable: true,
    photos: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1400&q=70',
    ],
  },
  {
    plate: 'DK-VENTE-05',
    brand: 'Ford',
    model: 'Ranger',
    year: 2019,
    color: 'Bleu',
    fuel: 'Diesel',
    vehicleType: 'Pick-up',
    mileage: 91000,
    salePrice: 14500000,
    saleNegotiable: true,
    photos: [
      'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1612825173281-9a193378527e?auto=format&fit=crop&w=1400&q=70',
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1400&q=70',
    ],
  },
]

async function downloadPhoto(url: string, destination: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Image introuvable (${response.status}) : ${url}`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  await writeFile(destination, bytes)
}

export default class extends BaseSeeder {
  async run() {
    const agency =
      (await Agency.query().where('slug', 'mobiprofil').where('isActive', true).first()) ??
      (await Agency.query()
        .where('isActive', true)
        .where('publishOnMarketplace', true)
        .orderBy('id', 'asc')
        .first()) ??
      (await Agency.query().where('isActive', true).orderBy('id', 'asc').first())

    if (!agency) {
      throw new Error('Aucune agence active. Créez une agence avant ce seed.')
    }

    if (!agency.publishOnMarketplace) {
      agency.publishOnMarketplace = true
      await agency.save()
    }

    const settings = await Setting.current(agency.id)
    const storageDir = app.makePath('storage/uploads/vehicles')
    await mkdir(storageDir, { recursive: true })

    for (const item of SALES) {
      let marque = await Marque.query().where('name', item.brand).whereNull('agencyId').first()
      if (!marque) {
        marque = await Marque.create({ name: item.brand, isActive: true, agencyId: null })
      }

      let modele = await Modele.query()
        .where('marqueId', marque.id)
        .where('name', item.model)
        .whereNull('agencyId')
        .first()
      if (!modele) {
        modele = await Modele.create({
          marqueId: marque.id,
          name: item.model,
          isActive: true,
          agencyId: null,
        })
      }

      let vehicle = await Vehicle.query().where('plate', item.plate).first()
      if (!vehicle) {
        vehicle = await Vehicle.create({
          agencyId: agency.id,
          ownerId: null,
          marqueId: marque.id,
          modeleId: modele.id,
          brand: item.brand,
          model: item.model,
          plate: item.plate,
          year: item.year,
          color: item.color,
          fuel: item.fuel,
          vehicleType: item.vehicleType,
          status: 'À vendre',
          offerType: 'sale',
          mileage: item.mileage,
          dailyPrice: 0,
          salePrice: item.salePrice,
          saleNegotiable: item.saleNegotiable,
          commissionPerDay: Number(settings.commissionPerDay ?? 0),
          notes: 'Annonce de démonstration — vente agence.',
          insuranceCompany: null,
          insuranceExpiresAt: null,
          technicalVisitAt: null,
          photoUrl: null,
          insuranceAlertStage: null,
          technicalVisitAlertStage: null,
          complianceHold: false,
          marketplacePublicationStatus: 'published',
          marketplaceSubmittedAt: null,
          marketplaceReviewedAt: null,
          marketplaceReviewedByUserId: null,
          marketplaceRejectionReason: null,
          marketplaceIsRereview: false,
          createdByUserId: null,
          updatedByUserId: null,
        })
      } else {
        vehicle.agencyId = agency.id
        vehicle.offerType = 'sale'
        vehicle.status = 'À vendre'
        vehicle.salePrice = item.salePrice
        vehicle.saleNegotiable = item.saleNegotiable
        vehicle.marketplacePublicationStatus = 'published'
        vehicle.complianceHold = false
        await vehicle.save()
      }

      const existingPhotos = await VehiclePhoto.query().where('vehicleId', vehicle.id)
      if (existingPhotos.length >= 3) continue

      for (const [index, url] of item.photos.entries()) {
        const fileName = `sale-seed-${item.plate}-${index + 1}.jpg`
        const absolute = join(storageDir, fileName)
        await downloadPhoto(url, absolute)
        await VehiclePhoto.create({
          vehicleId: vehicle.id,
          path: `storage/uploads/vehicles/${fileName}`,
          position: index + 1,
        })
      }
    }
  }
}
