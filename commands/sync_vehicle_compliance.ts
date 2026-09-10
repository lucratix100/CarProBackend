import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import VehicleComplianceService from '#services/vehicle_compliance_service'

export default class SyncVehicleCompliance extends BaseCommand {
  static commandName = 'vehicles:sync-compliance'
  static description =
    'Alerte assurance/CT bientôt expirés, notifie admin+propriétaire, met hors service si expiré'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const service = new VehicleComplianceService()
    const result = await service.syncAll()
    this.logger.success(
      `${result.checked} véhicule(s) · ${result.notified} notif(s) · ${result.held} hors service · ${result.released} libéré(s)`
    )
  }
}
