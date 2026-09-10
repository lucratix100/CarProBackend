import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Marque from '#models/marque'
import Modele from '#models/modele'

const CATALOGUE: Record<string, string[]> = {
  Toyota: ['Corolla', 'Hilux', 'RAV4', 'Land Cruiser', 'Yaris', 'Fortuner', 'Prado', 'Camry'],
  Hyundai: ['Tucson', 'Accent', 'Santa Fe', 'i10', 'Creta', 'Elantra', 'Palisade'],
  Peugeot: ['208', '301', '308', '2008', '3008', '5008', 'Partner'],
  Renault: ['Duster', 'Clio', 'Megane', 'Logan', 'Captur', 'Kadjar', 'Trafic'],
  Kia: ['Sportage', 'Picanto', 'Rio', 'Sorento', 'Seltos', 'Cerato'],
  Nissan: ['Qashqai', 'Patrol', 'Navara', 'Micra', 'X-Trail', 'Juke'],
  Mercedes: ['Classe A', 'Classe C', 'Classe E', 'GLE', 'GLC', 'Sprinter', 'Vito'],
  BMW: ['Série 1', 'Série 3', 'Série 5', 'X1', 'X3', 'X5'],
  Volkswagen: ['Golf', 'Polo', 'Tiguan', 'Passat', 'Amarok', 'Caddy'],
  Ford: ['Ranger', 'Focus', 'Everest', 'EcoSport', 'Transit', 'Explorer'],
  Suzuki: ['Swift', 'Jimny', 'Vitara', 'Alto', 'S-Cross'],
  Mitsubishi: ['Pajero', 'L200', 'Outlander', 'ASX', 'Eclipse Cross'],
  Honda: ['Civic', 'CR-V', 'Accord', 'HR-V', 'Jazz'],
  Chevrolet: ['Captiva', 'Spark', 'Trailblazer', 'Equinox'],
  Dacia: ['Sandero', 'Duster', 'Logan', 'Jogger'],
  Citroën: ['C3', 'C4', 'C5 Aircross', 'Berlingo'],
  Audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7'],
  'Land Rover': ['Defender', 'Discovery', 'Range Rover Evoque', 'Range Rover Sport'],
  Mazda: ['CX-5', 'CX-3', 'Mazda3', 'BT-50'],
  Isuzu: ['D-Max', 'mu-X'],
}

export default class extends BaseSeeder {
  async run() {
    for (const [marqueName, modeles] of Object.entries(CATALOGUE)) {
      let marque = await Marque.findBy('name', marqueName)
      if (!marque) {
        marque = await Marque.create({
          name: marqueName,
          isActive: true,
        })
      }

      for (const modeleName of modeles) {
        const existing = await Modele.query()
          .where('marqueId', marque.id)
          .where('name', modeleName)
          .first()
        if (!existing) {
          await Modele.create({
            marqueId: marque.id,
            name: modeleName,
            isActive: true,
          })
        }
      }
    }
  }
}
