import { Exception } from '@adonisjs/core/exceptions'
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
