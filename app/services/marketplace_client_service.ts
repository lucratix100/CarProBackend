import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import Client from '#models/client'
import ClientAccount from '#models/client_account'

function normalizePhone(phone: string) {
  return phone.replace(/[\s.-]/g, '').trim()
}

function isFilled(value: string | null | undefined) {
  if (!value) return false
  const n = value.trim().toLowerCase()
  return n.length > 0 && n !== 'à compléter' && n !== 'a completer'
}

/**
 * Fusionne / rattache un client marketplace selon téléphone, email, CIN ou permis.
 */
export default class MarketplaceClientService {
  async findMatch(input: {
    phone?: string | null
    email?: string | null
    idCardNumber?: string | null
    licenseNumber?: string | null
  }) {
    if (isFilled(input.phone)) {
      const phone = normalizePhone(input.phone!)
      const byPhone = await Client.query().whereRaw("replace(replace(replace(phone, ' ', ''), '-', ''), '.', '') = ?", [
        phone,
      ]).first()
      if (byPhone) return byPhone
    }

    if (isFilled(input.email)) {
      const byEmail = await Client.query()
        .whereRaw('lower(email) = ?', [input.email!.trim().toLowerCase()])
        .first()
      if (byEmail) return byEmail
    }

    if (isFilled(input.idCardNumber)) {
      const byCin = await Client.query()
        .whereRaw('lower(id_card_number) = ?', [input.idCardNumber!.trim().toLowerCase()])
        .first()
      if (byCin) return byCin
    }

    if (isFilled(input.licenseNumber)) {
      const byLicense = await Client.query()
        .whereRaw('lower(license_number) = ?', [input.licenseNumber!.trim().toLowerCase()])
        .first()
      if (byLicense) return byLicense
    }

    return null
  }

  async upsertFromAuth(payload: {
    email: string
    fullName?: string | null
    phone?: string | null
    betterAuthUserId?: string | null
    googleId?: string | null
  }) {
    const email = payload.email.trim().toLowerCase()
    let account = await ClientAccount.query().where('email', email).first()

    if (!account && payload.betterAuthUserId) {
      account = await ClientAccount.query()
        .where('betterAuthUserId', payload.betterAuthUserId)
        .first()
    }

    if (!account && payload.googleId) {
      account = await ClientAccount.query().where('googleId', payload.googleId).first()
    }

    let client: Client | null = account
      ? await Client.find(account.clientId)
      : await this.findMatch({
          email,
          phone: payload.phone,
        })

    if (!client) {
      client = await Client.create({
        agencyId: null,
        fullName: payload.fullName?.trim() || email.split('@')[0],
        phone: payload.phone?.trim() || 'À COMPLÉTER',
        email,
        licenseNumber: null,
        licenseExpiresAt: null,
        idCardNumber: null,
        type: 'particulier',
        source: 'marketplace',
        isActive: true,
        notes: null,
        city: null,
        birthDate: null,
      })
    } else {
      if (payload.fullName?.trim()) client.fullName = payload.fullName.trim()
      if (payload.phone?.trim() && (!isFilled(client.phone) || client.phone === 'À COMPLÉTER')) {
        client.phone = payload.phone.trim()
      }
      if (!client.email) client.email = email
      if (client.source !== 'marketplace' && !client.agencyId) {
        client.source = 'marketplace'
      }
      await client.save()
    }

    if (!account) {
      account = await ClientAccount.create({
        clientId: client.id,
        email,
        fullName: payload.fullName?.trim() || client.fullName,
        phone: payload.phone?.trim() || null,
        betterAuthUserId: payload.betterAuthUserId ?? null,
        googleId: payload.googleId ?? null,
        password: null,
        status: 'active',
      })
    } else {
      account.clientId = client.id
      account.email = email
      if (payload.fullName?.trim()) account.fullName = payload.fullName.trim()
      if (payload.phone?.trim()) account.phone = payload.phone.trim()
      if (payload.betterAuthUserId) account.betterAuthUserId = payload.betterAuthUserId
      if (payload.googleId) account.googleId = payload.googleId
      await account.save()
    }

    return { account, client }
  }

  async applyBookingIdentity(
    client: Client,
    payload: {
      phone?: string
      licenseNumber?: string
      licenseExpiresAt?: string
      idCardNumber?: string
    }
  ) {
    if (payload.phone) {
      const match = await this.findMatch({ phone: payload.phone })
      if (match && match.id !== client.id) {
        throw new Exception('Ce numéro de téléphone est déjà utilisé par un autre client.', {
          status: 422,
          code: 'E_PHONE_TAKEN',
        })
      }
      client.phone = payload.phone.trim()
    }
    if (payload.licenseNumber) {
      const match = await this.findMatch({ licenseNumber: payload.licenseNumber })
      if (match && match.id !== client.id) {
        throw new Exception('Ce numéro de permis est déjà utilisé par un autre client.', {
          status: 422,
          code: 'E_LICENSE_TAKEN',
        })
      }
      client.licenseNumber = payload.licenseNumber.trim()
    }
    if (payload.idCardNumber) {
      const match = await this.findMatch({ idCardNumber: payload.idCardNumber })
      if (match && match.id !== client.id) {
        throw new Exception('Ce numéro de CIN est déjà utilisé par un autre client.', {
          status: 422,
          code: 'E_CIN_TAKEN',
        })
      }
      client.idCardNumber = payload.idCardNumber.trim()
    }
    if (payload.licenseExpiresAt) {
      client.licenseExpiresAt = DateTime.fromISO(payload.licenseExpiresAt)
    }
    await client.save()
    return client
  }

  async updateProfile(
    account: ClientAccount,
    payload: {
      fullName?: string
      phone?: string
      licenseNumber?: string | null
      licenseExpiresAt?: string | null
      idCardNumber?: string | null
    }
  ) {
    await account.load('client')
    const client = account.client
    if (!client) {
      throw new Exception('Profil client introuvable.', {
        status: 404,
        code: 'E_CLIENT_MISSING',
      })
    }

    if (payload.fullName?.trim()) {
      account.fullName = payload.fullName.trim()
      client.fullName = payload.fullName.trim()
    }

    await this.applyBookingIdentity(client, {
      phone: payload.phone,
      licenseNumber: payload.licenseNumber ?? undefined,
      licenseExpiresAt: payload.licenseExpiresAt ?? undefined,
      idCardNumber: payload.idCardNumber ?? undefined,
    })

    if (payload.phone?.trim()) {
      account.phone = payload.phone.trim()
    }

    await account.save()
    await client.refresh()
    return { account, client }
  }
}
