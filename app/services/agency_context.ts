import { Exception } from '@adonisjs/core/exceptions'
import Agency from '#models/agency'
import PartnerApplication from '#models/partner_application'
import type User from '#models/user'

/**
 * Resolve the tenant agency for an agency-scoped admin or owner.
 */
export function requireAgencyId(user: User): number {
  if (user.role === 'super_admin') {
    throw new Exception('Cette action est réservée aux administrateurs d’agence.', {
      status: 403,
      code: 'E_AGENCY_REQUIRED',
    })
  }

  if (!user.agencyId) {
    throw new Exception('Aucune agence associée à ce compte.', {
      status: 403,
      code: 'E_NO_AGENCY',
    })
  }

  return user.agencyId
}

export function slugifyAgencyName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Clé de comparaison : sans casse, accents, espaces ni ponctuation. */
export function agencyNameKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 160)
}

export async function assertAgencyNameAvailable(
  name: string,
  options?: { exceptAgencyId?: number; exceptApplicationId?: number }
) {
  const key = agencyNameKey(name)
  if (!key) {
    throw new Exception('Indiquez un nom d’agence composé de lettres ou de chiffres.', {
      status: 422,
      code: 'E_AGENCY_NAME_INVALID',
    })
  }

  const agencyQuery = Agency.query().where('nameKey', key)
  if (options?.exceptAgencyId) {
    agencyQuery.whereNot('id', options.exceptAgencyId)
  }
  const existing = await agencyQuery.first()
  if (existing) {
    throw new Exception('Une agence porte déjà ce nom.', {
      status: 409,
      code: 'E_AGENCY_NAME_TAKEN',
    })
  }

  const pending = await PartnerApplication.query()
    .where('type', 'agency')
    .where('status', 'pending')
    .whereNotNull('agencyName')
  const clash = pending.find(
    (row) =>
      row.id !== options?.exceptApplicationId &&
      row.agencyName &&
      agencyNameKey(row.agencyName) === key
  )
  if (clash) {
    throw new Exception('Une demande est déjà en cours pour ce nom d’agence.', {
      status: 409,
      code: 'E_AGENCY_NAME_PENDING',
    })
  }

  return key
}

/** Refuse un slug déjà pris. Ne suffixe pas pour contourner un doublon. */
export async function assertAgencySlugAvailable(slug: string, exceptAgencyId?: number) {
  const query = Agency.query().where('slug', slug)
  if (exceptAgencyId) query.whereNot('id', exceptAgencyId)
  const existing = await query.first()
  if (existing) {
    throw new Exception('Cet identifiant d’agence est déjà utilisé. Choisissez un autre nom.', {
      status: 409,
      code: 'E_AGENCY_SLUG_TAKEN',
    })
  }
}
