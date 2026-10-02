import { BaseSeeder } from '@adonisjs/lucid/seeders'
import PermissionService from '#services/permission_service'

/**
 * Seed du catalogue de permissions et des rôles système collaborateurs.
 */
export default class extends BaseSeeder {
  async run() {
    await new PermissionService().ensureCatalogSeeded()
  }
}
