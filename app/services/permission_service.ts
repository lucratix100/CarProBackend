import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'
import Permission from '#models/permission'
import StaffRole from '#models/staff_role'
import UserPermissionOverride from '#models/user_permission_override'
import User from '#models/user'
import {
  ALL_PERMISSION_CODES,
  PERMISSION_CATALOG,
  STAFF_ROLE_TEMPLATES,
  isKnownPermission,
} from '#constants/permissions'

export default class PermissionService {
  /**
   * Seed idempotent du catalogue + rôles système.
   */
  async ensureCatalogSeeded() {
    for (const def of PERMISSION_CATALOG) {
      const existing = await Permission.findBy('code', def.code)
      if (existing) {
        existing.module = def.module
        existing.label = def.label
        await existing.save()
      } else {
        await Permission.create({
          code: def.code,
          module: def.module,
          label: def.label,
        })
      }
    }

    const permissions = await Permission.query()
    const byCode = new Map(permissions.map((p) => [p.code, p]))

    for (const template of STAFF_ROLE_TEMPLATES) {
      let role = await StaffRole.query()
        .whereNull('agencyId')
        .where('slug', template.slug)
        .first()

      if (!role) {
        role = await StaffRole.create({
          agencyId: null,
          slug: template.slug,
          name: template.name,
          description: template.description,
          isSystem: true,
        })
      } else {
        role.name = template.name
        role.description = template.description
        role.isSystem = true
        await role.save()
      }

      const permissionIds = template.permissions
        .map((code) => byCode.get(code)?.id)
        .filter((id): id is number => typeof id === 'number')

      await role.related('permissions').sync(permissionIds)
    }
  }

  async listCatalog() {
    await this.ensureCatalogSeeded()
    return Permission.query().orderBy('module', 'asc').orderBy('code', 'asc')
  }

  /**
   * Rôles disponibles pour une agence : système + rôles custom de l’agence.
   */
  async listRolesForAgency(agencyId: number) {
    await this.ensureCatalogSeeded()
    return StaffRole.query()
      .where((q) => {
        q.whereNull('agencyId').orWhere('agencyId', agencyId)
      })
      .preload('permissions')
      .orderBy('isSystem', 'desc')
      .orderBy('name', 'asc')
  }

  async findRoleForAgency(roleId: number, agencyId: number) {
    const role = await StaffRole.query()
      .where('id', roleId)
      .where((q) => {
        q.whereNull('agencyId').orWhere('agencyId', agencyId)
      })
      .preload('permissions')
      .first()

    if (!role) {
      throw new Exception('Rôle introuvable.', { status: 404, code: 'E_ROLE_NOT_FOUND' })
    }
    return role
  }

  async createAgencyRole(
    agencyId: number,
    payload: { slug: string; name: string; description?: string | null; permissionCodes: string[] }
  ) {
    await this.ensureCatalogSeeded()
    const slug = payload.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, '_')
      .slice(0, 60)

    const existing = await StaffRole.query().where('agencyId', agencyId).where('slug', slug).first()
    if (existing) {
      throw new Exception('Un rôle avec ce code existe déjà pour cette agence.', {
        status: 422,
        code: 'E_ROLE_EXISTS',
      })
    }

    const role = await StaffRole.create({
      agencyId,
      slug,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      isSystem: false,
    })

    await this.syncRolePermissions(role, payload.permissionCodes)
    await role.load('permissions')
    return role
  }

  async updateAgencyRole(
    role: StaffRole,
    payload: {
      name?: string
      description?: string | null
      permissionCodes?: string[]
    }
  ) {
    if (role.isSystem || role.agencyId === null) {
      throw new Exception('Les rôles système ne peuvent pas être modifiés.', {
        status: 422,
        code: 'E_SYSTEM_ROLE',
      })
    }
    if (payload.name !== undefined) role.name = payload.name.trim()
    if (payload.description !== undefined) {
      role.description = payload.description?.trim() || null
    }
    await role.save()
    if (payload.permissionCodes) {
      await this.syncRolePermissions(role, payload.permissionCodes)
    }
    await role.load('permissions')
    return role
  }

  async syncRolePermissions(role: StaffRole, codes: string[]) {
    const unique = [...new Set(codes.filter(isKnownPermission))]
    const permissions = await Permission.query().whereIn('code', unique)
    await role.related('permissions').sync(permissions.map((p) => p.id))
  }

  /**
   * Permissions effectives d’un utilisateur (codes).
   */
  async resolvePermissionCodes(user: User): Promise<Set<string>> {
    if (user.role === 'super_admin') {
      return new Set(ALL_PERMISSION_CODES)
    }

    if (user.role === 'admin') {
      return new Set(ALL_PERMISSION_CODES)
    }

    if (user.role !== 'staff') {
      return new Set()
    }

    const codes = new Set<string>()

    if (user.staffRoleId) {
      const role = await StaffRole.query()
        .where('id', user.staffRoleId)
        .preload('permissions')
        .first()
      if (role) {
        for (const p of role.permissions) codes.add(p.code)
      }
    }

    const overrides = await UserPermissionOverride.query()
      .where('userId', user.id)
      .preload('permission')

    for (const override of overrides) {
      const code = override.permission?.code
      if (!code) continue
      if (override.granted) codes.add(code)
      else codes.delete(code)
    }

    return codes
  }

  async hasPermission(user: User, code: string): Promise<boolean> {
    if (!isKnownPermission(code)) return false
    if (user.role === 'admin' || user.role === 'super_admin') return true
    const codes = await this.resolvePermissionCodes(user)
    return codes.has(code)
  }

  async assertPermission(user: User, code: string) {
    const ok = await this.hasPermission(user, code)
    if (!ok) {
      throw new Exception('Permission insuffisante pour cette action.', {
        status: 403,
        code: 'E_FORBIDDEN_PERMISSION',
      })
    }
  }

  async assertAnyPermission(user: User, codes: string[]) {
    for (const code of codes) {
      if (await this.hasPermission(user, code)) return
    }
    throw new Exception('Permission insuffisante pour cette action.', {
      status: 403,
      code: 'E_FORBIDDEN_PERMISSION',
    })
  }

  /**
   * Remplace les overrides d’un collaborateur.
   * `grantedCodes` = liste absolue des permissions accordées (après personnalisation).
   */
  async setUserPermissionOverrides(user: User, grantedCodes: string[]) {
    if (user.role !== 'staff') {
      throw new Exception('Les overrides ne s’appliquent qu’aux collaborateurs.', {
        status: 422,
        code: 'E_NOT_STAFF',
      })
    }

    await this.ensureCatalogSeeded()
    const roleCodes = new Set<string>()
    if (user.staffRoleId) {
      const role = await StaffRole.query()
        .where('id', user.staffRoleId)
        .preload('permissions')
        .first()
      if (role) {
        for (const p of role.permissions) roleCodes.add(p.code)
      }
    }

    const desired = new Set(grantedCodes.filter(isKnownPermission))
    const permissions = await Permission.query()
    const byCode = new Map(permissions.map((p) => [p.code, p]))

    await db.transaction(async (trx) => {
      await UserPermissionOverride.query({ client: trx }).where('userId', user.id).delete()

      for (const perm of permissions) {
        const inRole = roleCodes.has(perm.code)
        const inDesired = desired.has(perm.code)
        if (inRole === inDesired) continue

        await UserPermissionOverride.create(
          {
            userId: user.id,
            permissionId: byCode.get(perm.code)!.id,
            granted: inDesired,
          },
          { client: trx }
        )
      }
    })
  }

  async getEffectivePermissionsMap(user: User): Promise<Record<string, boolean>> {
    const codes = await this.resolvePermissionCodes(user)
    const map: Record<string, boolean> = {}
    for (const code of ALL_PERMISSION_CODES) {
      map[code] = codes.has(code)
    }
    return map
  }
}
