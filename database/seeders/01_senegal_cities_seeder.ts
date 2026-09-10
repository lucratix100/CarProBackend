import { BaseSeeder } from '@adonisjs/lucid/seeders'
import City from '#models/city'

/**
 * 14 régions du Sénégal + principales communes / villes.
 * `region` = nom de la région administrative ; `name` = ville/commune.
 */
const SENEGAL_CITIES: Record<string, string[]> = {
  Dakar: [
    'Dakar',
    'Pikine',
    'Guédiawaye',
    'Rufisque',
    'Keur Massar',
    'Bargny',
    'Sangalkam',
    'Yoff',
    'Ouakam',
    'Parcelles Assainies',
  ],
  Thiès: ['Thiès', 'Mbour', 'Tivaouane', 'Joal-Fadiouth', 'Khombole', 'Saly', 'Popenguine', 'Somone'],
  'Saint-Louis': ['Saint-Louis', 'Richard-Toll', 'Dagana', 'Podor', 'Gandon'],
  Diourbel: ['Diourbel', 'Touba', 'Mbacké', 'Bambey'],
  Louga: ['Louga', 'Kébémer', 'Linguère'],
  Fatick: ['Fatick', 'Foundiougne', 'Gossas', 'Sokone', 'Passy'],
  Kaolack: ['Kaolack', 'Nioro du Rip', 'Guinguinéo', 'Kahone'],
  Kaffrine: ['Kaffrine', 'Koungheul', 'Malem Hoddar', 'Birkilane'],
  Tambacounda: ['Tambacounda', 'Bakel', 'Goudiry', 'Koumpentoum'],
  Kédougou: ['Kédougou', 'Saraya', 'Salémata'],
  Kolda: ['Kolda', 'Vélingara', 'Médina Yoro Foulah'],
  Sédhiou: ['Sédhiou', 'Bounkiling', 'Goudomp'],
  Ziguinchor: ['Ziguinchor', 'Bignona', 'Oussouye', 'Cap Skirring', 'Diouloulou'],
  Matam: ['Matam', 'Kanel', 'Ranérou', 'Ourossogui'],
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default class extends BaseSeeder {
  async run() {
    for (const [region, cities] of Object.entries(SENEGAL_CITIES)) {
      for (const name of cities) {
        const slug = slugify(`${region}-${name}`)
        const existing = await City.findBy('slug', slug)
        if (!existing) {
          await City.create({
            name,
            region,
            slug,
            isActive: true,
          })
        }
      }
    }
  }
}
