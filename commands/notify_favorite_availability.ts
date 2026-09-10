import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import MarketplaceFavoriteNotifyService from '#services/marketplace_favorite_notify_service'

export default class NotifyFavoriteAvailability extends BaseCommand {
  static commandName = 'favorites:notify-available'
  static description =
    'Envoie un email aux clients dont un favori avec alerte est de nouveau disponible aujourd’hui'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const service = new MarketplaceFavoriteNotifyService()
    const result = await service.notifyDueFavorites()
    this.logger.success(
      `${result.sent} email(s) envoyé(s), ${result.reset} alerte(s) réarmée(s), ${result.skipped} ignorée(s) / ${result.total} suivi(s)`
    )
  }
}
