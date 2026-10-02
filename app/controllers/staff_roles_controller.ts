import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import PermissionService from '#services/permission_service'
import { createStaffRoleValidator, updateStaffRoleValidator } from '#validators/staff'

function serializeRole(role: Awaited<ReturnType<PermissionService['findRoleForAgency']>>) {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    agencyId: role.agencyId,
    permissionCodes: (role.permissions ?? []).map((p) => p.code),
  }
}

/**
 * Rôles & catalogue de permissions — réservé au gérant d’agence.
 */
export default class StaffRolesController {
  #permissions = new PermissionService()

  async catalog({ serialize }: HttpContext) {
    const catalog = await this.#permissions.listCatalog()
    return serialize({
      data: catalog.map((p) => ({
        code: p.code,
        module: p.module,
        label: p.label,
      })),
    })
  }

  async index({ serialize, agencyId }: HttpContext) {
    const roles = await this.#permissions.listRolesForAgency(agencyId!)
    return serialize({
      data: roles.map(serializeRole),
    })
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createStaffRoleValidator)
    const slug =
      payload.slug ??
      payload.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60)

    try {
      const role = await this.#permissions.createAgencyRole(agencyId!, {
        slug,
        name: payload.name,
        description: payload.description,
        permissionCodes: payload.permissionCodes,
      })
      return response.created(await serialize({ data: serializeRole(role) }))
    } catch (error) {
      throw new Exception((error as Error).message, {
        status: 422,
        code: 'E_CREATE_ROLE',
      })
    }
  }

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const role = await this.#permissions.findRoleForAgency(Number(params.id), agencyId!)
    if (role.agencyId !== agencyId) {
      throw new Exception('Les rôles système ne peuvent pas être modifiés.', {
        status: 422,
        code: 'E_SYSTEM_ROLE',
      })
    }
    const payload = await request.validateUsing(updateStaffRoleValidator)
    const updated = await this.#permissions.updateAgencyRole(role, payload)
    return serialize({ data: serializeRole(updated) })
  }
}
