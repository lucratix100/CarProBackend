import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import User from '#models/user'

/**
 * Crée uniquement le compte super administrateur.
 * Identifiants surchargables via env (utile en prod Dokploy).
 */
export default class extends BaseSeeder {
  async run() {
    const email = process.env.SUPER_ADMIN_EMAIL || 'super@pcs.sn'
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Super@!#9731'
    const fullName = process.env.SUPER_ADMIN_NAME || 'Super Administrateur'

    const existing = await User.findBy('email', email)
    if (existing) {
      existing.fullName = fullName
      existing.role = 'super_admin'
      existing.status = 'active'
      existing.agencyId = null
      existing.password = password
      existing.passwordSetAt = DateTime.now()
      existing.invitationToken = null
      existing.invitationExpiresAt = null
      await existing.save()
      return
    }

    await User.create({
      fullName,
      email,
      password,
      role: 'super_admin',
      status: 'active',
      agencyId: null,
      passwordSetAt: DateTime.now(),
      invitationToken: null,
      invitationExpiresAt: null,
      termsVersion: null,
      termsAcceptedAt: null,
      termsAcceptedIp: null,
    })
  }
}
