import { writeFile } from 'node:fs/promises'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import RentalContractService from '#services/rental_contract_service'
import OwnerStatementService from '#services/owner_statement_service'

export default class DebugPdf extends BaseCommand {
  static commandName = 'debug:pdf'
  static description = 'Génère un contrat et un relevé pour diagnostic'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const contracts = new RentalContractService()
    try {
      const rental = await contracts.loadRental(6, 1)
      const pdf = await contracts.generate(rental)
      await writeFile('/tmp/contrat-test.pdf', pdf)
      this.logger.success(`contrat ${pdf.length} bytes ${pdf.subarray(0, 5).toString()}`)
    } catch (error) {
      this.logger.error(`contrat: ${error instanceof Error ? error.stack : error}`)
    }

    try {
      const statements = new OwnerStatementService()
      const data = await statements.build(1, 1, {})
      const pdf = await statements.generatePdf(data)
      await writeFile('/tmp/releve-test.pdf', pdf)
      this.logger.success(`releve ${pdf.length} bytes ${pdf.subarray(0, 5).toString()}`)
    } catch (error) {
      this.logger.error(`releve: ${error instanceof Error ? error.stack : error}`)
    }

    const user = await User.findOrFail(4)
    const token = await User.accessTokens.create(user)
    await writeFile('/tmp/pcs-token.txt', token.value!.release())
    this.logger.info('token écrit')
  }
}
