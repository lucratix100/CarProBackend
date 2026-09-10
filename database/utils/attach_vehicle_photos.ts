import { copyFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import Vehicle from '#models/vehicle'
import VehiclePhoto from '#models/vehicle_photo'

const FIXTURE_DIR = app.makePath('database/seeders/fixtures/vehicles')

/** Couverture préférée par plaque (seed marketplace / démo). */
const COVER_BY_PLATE: Record<string, string> = {
  'DK-1234-AB': 'car-01.jpeg', // Toyota Corolla blanche
  'DK-5678-CD': 'car-02.jpeg', // Hyundai Tucson noir
  'DK-9012-EF': 'car-03.jpeg', // Toyota Hilux
  'DK-3456-GH': 'car-04.jpeg', // Peugeot 208 rouge
  'DK-7890-IJ': 'car-05.jpeg', // Mercedes Classe E
  'TH-1001-AA': 'car-06.jpeg', // Renault Duster
  'TH-1002-BB': 'car-07.jpeg', // Kia Sportage bleu
  'TH-1003-CC': 'car-08.jpeg', // Toyota Yaris
  'SL-2001-DD': 'car-09.jpeg', // Mitsubishi Pajero
  'SL-2002-EE': 'car-10.jpeg', // Hyundai Accent
  'TH-3001-FF': 'car-11.jpeg', // Dacia Sandero orange
  'TH-3002-GG': 'car-12.jpeg', // Ford Ranger
  'DK-5678-CB': 'car-13.jpeg', // BMW
}

const DETAIL_FILES = ['car-17.jpeg', 'car-18.jpeg', 'car-19.jpeg', 'car-20.jpeg'] as const

async function listFixtureFiles() {
  const entries = await readdir(FIXTURE_DIR)
  return entries.filter((name) => /^car-\d{2}\.jpeg$/i.test(name)).sort()
}

function pickFixtures(vehicle: Vehicle, allFiles: string[], photoCount: number) {
  const coverPreferred = COVER_BY_PLATE[vehicle.plate]
  const cover =
    coverPreferred && allFiles.includes(coverPreferred)
      ? coverPreferred
      : allFiles[(Math.max(vehicle.id, 1) - 1) % allFiles.length]!

  const others = allFiles.filter((f) => f !== cover)
  const detailSet = new Set<string>(DETAIL_FILES)
  const detailPool = DETAIL_FILES.filter((f) => allFiles.includes(f) && f !== cover)
  const anglePool = others.filter((f) => !detailSet.has(f))

  const selected = [cover]
  // Angles distincts : décalage selon l’id pour éviter le même lot
  const offset = (vehicle.id * 3) % Math.max(anglePool.length, 1)
  for (let i = 0; selected.length < photoCount - 1 && anglePool.length > 0; i++) {
    selected.push(anglePool[(offset + i) % anglePool.length]!)
  }
  // Dernière photo : détail (intérieur / roue / coffre) unique par véhicule
  if (selected.length < photoCount && detailPool.length > 0) {
    selected.push(detailPool[(vehicle.id - 1) % detailPool.length]!)
  }
  while (selected.length < photoCount && others.length > 0) {
    const next = others[selected.length % others.length]!
    if (!selected.includes(next)) selected.push(next)
    else break
  }

  return selected.slice(0, photoCount)
}

/**
 * Copie des JPEG de fixtures distincts vers storage/uploads et crée les VehiclePhoto.
 * Par défaut remplace les photos seed existantes pour pouvoir régénérer les images.
 */
export async function attachVehiclePhotos(
  vehicle: Vehicle,
  photoCount = 4,
  options: { replaceExisting?: boolean } = { replaceExisting: true }
) {
  const existing = await VehiclePhoto.query()
    .where('vehicleId', vehicle.id)
    .orderBy('position', 'asc')
    .orderBy('id', 'asc')

  if (existing.length > 0 && !options.replaceExisting) {
    if (!vehicle.photoUrl && existing[0]) {
      vehicle.photoUrl = `/vehicles/${vehicle.id}/photos/${existing[0].id}`
      await vehicle.save()
    }
    return existing
  }

  for (const photo of existing) {
    try {
      await unlink(app.makePath(photo.path))
    } catch {
      // fichier déjà absent
    }
    await photo.delete()
  }

  const allFiles = await listFixtureFiles()
  if (allFiles.length < 3) {
    throw new Error(
      `Fixtures véhicules insuffisantes dans ${FIXTURE_DIR} (trouvé ${allFiles.length}, min 3).`
    )
  }

  const storageDir = app.makePath('storage/uploads/vehicles')
  await mkdir(storageDir, { recursive: true })

  const count = Math.min(Math.max(photoCount, 3), 5, allFiles.length)
  const fixtures = pickFixtures(vehicle, allFiles, count)
  const created: VehiclePhoto[] = []

  for (let position = 0; position < fixtures.length; position++) {
    const fixtureName = fixtures[position]!
    const fileName = `vehicle-${vehicle.id}-${position}-seed.jpeg`
    const relativePath = `storage/uploads/vehicles/${fileName}`
    await copyFile(join(FIXTURE_DIR, fixtureName), app.makePath(relativePath))

    const photo = await VehiclePhoto.create({
      vehicleId: vehicle.id,
      path: relativePath,
      position,
    })
    created.push(photo)
  }

  const cover = created[0]
  if (cover) {
    vehicle.photoUrl = `/vehicles/${vehicle.id}/photos/${cover.id}`
    await vehicle.save()
  }

  return created
}
