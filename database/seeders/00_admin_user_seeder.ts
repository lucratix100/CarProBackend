import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import User from '#models/user'
import Agency from '#models/agency'
import Setting from '#models/setting'

export default class extends BaseSeeder {
  async run() {
    let agency = await Agency.findBy('slug', 'pcs')
    if (!agency) {
      agency = await Agency.create({
        name: 'Profil Car Service',
        slug: 'pcs',
        isActive: true,
        notes: 'Agence par défaut',
      })
    }

    await Setting.current(agency.id)

    const superEmail = 'super@pcs.sn'
    const existingSuper = await User.findBy('email', superEmail)
    if (!existingSuper) {
      await User.create({
        fullName: 'Super Administrateur',
        email: superEmail,
        password: 'super123',
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

    // Compat : ancien admin@pcs.sn → super_admin s’il existe encore sans agence
    const legacyAdmin = await User.findBy('email', 'admin@pcs.sn')
    if (legacyAdmin && legacyAdmin.role === 'admin' && !legacyAdmin.agencyId) {
      legacyAdmin.role = 'super_admin'
      await legacyAdmin.save()
    } else if (!legacyAdmin) {
      // Si pas de legacy, créer aussi un admin d’agence démo
    }

    const agencyAdminEmail = 'admin@pcs.sn'
    const agencyAdmin = await User.findBy('email', agencyAdminEmail)
    if (!agencyAdmin) {
      await User.create({
        fullName: 'Administrateur PCS',
        email: agencyAdminEmail,
        password: 'admin123',
        role: 'admin',
        status: 'active',
        agencyId: agency.id,
        passwordSetAt: DateTime.now(),
        invitationToken: null,
        invitationExpiresAt: null,
        termsVersion: null,
        termsAcceptedAt: null,
        termsAcceptedIp: null,
      })
    } else if (agencyAdmin.role === 'super_admin') {
      // Après migration : admin@pcs.sn est devenu super_admin.
      // On crée un admin d’agence dédié pour le back-office.
      const demoAdminEmail = 'agence@pcs.sn'
      const demoAdmin = await User.findBy('email', demoAdminEmail)
      if (!demoAdmin) {
        await User.create({
          fullName: 'Admin Agence PCS',
          email: demoAdminEmail,
          password: 'admin123',
          role: 'admin',
          status: 'active',
          agencyId: agency.id,
          passwordSetAt: DateTime.now(),
          invitationToken: null,
          invitationExpiresAt: null,
          termsVersion: null,
          termsAcceptedAt: null,
          termsAcceptedIp: null,
        })
      }
    } else if (agencyAdmin.role === 'admin' && !agencyAdmin.agencyId) {
      agencyAdmin.agencyId = agency.id
      await agencyAdmin.save()
    }
  }
}
