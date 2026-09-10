import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import RentalService from '#services/rental_service'
import MarketplaceFavoriteNotifyService from '#services/marketplace_favorite_notify_service'

export default class SyncRentalStatuses extends BaseCommand {
  static commandName = 'rentals:sync-statuses'
  static description = 'Met à jour les statuts des locations selon les dates'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const service = new RentalService()
    const updated = await service.syncStatusesFromDates()
    this.logger.success(`${updated} location(s) mise(s) à jour`)

    const notify = new MarketplaceFavoriteNotifyService()
    const result = await notify.notifyDueFavorites()
    this.logger.info(
      `Alertes favoris : ${result.sent} email(s), ${result.reset} réarmée(s)`
    )
  }
}
