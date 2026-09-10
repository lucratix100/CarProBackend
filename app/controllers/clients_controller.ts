import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import ClientLicenseUploadService from '#services/client_license_upload_service'
import ClientTransformer from '#transformers/client_transformer'
import { createClientValidator, updateClientValidator } from '#validators/client'

function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return DateTime.fromISO(value)
}

function isFilled(value: string | null | undefined) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 && normalized !== 'à compléter' && normalized !== 'a completer'
}

function withLicenseFlags(client: Client, serialized: unknown) {
  const base =
    serialized && typeof serialized === 'object' && 'data' in serialized
      ? (serialized as { data: Record<string, unknown> }).data
      : (serialized as Record<string, unknown>)

  const expiresAt = client.licenseExpiresAt?.toISODate?.() ?? null
  const today = DateTime.now().toISODate()!
  const licenseExpired = Boolean(expiresAt && expiresAt < today)
  const isVerified =
    isFilled(client.fullName) &&
    isFilled(client.phone) &&
    isFilled(client.licenseNumber) &&
    isFilled(client.idCardNumber) &&
    Boolean(expiresAt) &&
    !licenseExpired &&
    client.isActive !== false

  return {
    ...base,
    hasLicenseRecto: Boolean(client.licenseRectoPath),
    hasLicenseVerso: Boolean(client.licenseVersoPath),
    licenseRectoUrl: client.licenseRectoPath ? `/clients/${client.id}/license/recto` : null,
    licenseVersoUrl: client.licenseVersoPath ? `/clients/${client.id}/license/verso` : null,
    licenseExpired,
    isVerified,
  }
}

export default class ClientsController {
  #uploads = new ClientLicenseUploadService()

  async #findScoped(id: number | string, agencyId: number) {
    return Client.query().where('id', id).where('agencyId', agencyId).firstOrFail()
  }

  async index({ request, serialize, agencyId }: HttpContext) {
    const q = request.input('q')
    const includeInactive = ['1', 'true', true].includes(request.input('includeInactive'))
    const isActive = request.input('isActive')
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPageRaw = Number(request.input('perPage', 10)) || 10
    const perPage = Math.min(100, Math.max(1, perPageRaw))

    const query = Client.query().where('agencyId', agencyId!)

    if (isActive === 'true' || isActive === true || isActive === '1') {
      query.where('isActive', true)
    } else if (isActive === 'false' || isActive === false || isActive === '0') {
      query.where('isActive', false)
    } else if (!includeInactive) {
      query.where('isActive', true)
    }

    if (q) {
      query.where((builder) => {
        builder
          .whereILike('fullName', `%${q}%`)
          .orWhereILike('phone', `%${q}%`)
          .orWhereILike('email', `%${q}%`)
      })
    }

    const paginator = await query.orderBy('id', 'desc').paginate(page, perPage)
    paginator.baseUrl('/clients')
    paginator.queryString(request.qs())

    const data = await Promise.all(
      paginator.all().map(async (client) => {
        const serialized = await serialize(ClientTransformer.transform(client))
        return withLicenseFlags(client, serialized)
      })
    )

    return {
      meta: paginator.getMeta(),
      data,
    }
  }

  async store({ request, response, serialize, agencyId }: HttpContext) {
    const payload = await request.validateUsing(createClientValidator)
    const client = await Client.create({
      agencyId: agencyId!,
      source: 'agency',
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email ?? null,
      licenseNumber: payload.licenseNumber,
      licenseExpiresAt: DateTime.fromISO(payload.licenseExpiresAt),
      idCardNumber: payload.idCardNumber,
      city: payload.city ?? null,
      birthDate: toDate(payload.birthDate) ?? null,
      type: payload.type,
      notes: payload.notes ?? null,
      isActive: payload.isActive ?? true,
    })
    const serialized = await serialize(ClientTransformer.transform(client))
    return response.created(withLicenseFlags(client, serialized))
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const client = await this.#findScoped(params.id, agencyId!)
    const serialized = await serialize(ClientTransformer.transform(client))
    return withLicenseFlags(client, serialized)
  }

  async update({ params, request, serialize, agencyId }: HttpContext) {
    const client = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(updateClientValidator)

    client.merge({
      fullName: payload.fullName ?? client.fullName,
      phone: payload.phone ?? client.phone,
      email: payload.email === undefined ? client.email : payload.email,
      licenseNumber: payload.licenseNumber === undefined ? client.licenseNumber : payload.licenseNumber,
      idCardNumber: payload.idCardNumber === undefined ? client.idCardNumber : payload.idCardNumber,
      city: payload.city === undefined ? client.city : payload.city,
      type: payload.type ?? client.type,
      notes: payload.notes === undefined ? client.notes : payload.notes,
      isActive: payload.isActive === undefined ? client.isActive : payload.isActive,
    })

    if (payload.birthDate !== undefined) {
      client.birthDate = toDate(payload.birthDate) ?? null
    }

    if (payload.licenseExpiresAt !== undefined) {
      client.licenseExpiresAt = DateTime.fromISO(payload.licenseExpiresAt)
    }

    await client.save()
    const serialized = await serialize(ClientTransformer.transform(client))
    return withLicenseFlags(client, serialized)
  }

  async uploadLicense({ params, request, response, serialize, agencyId }: HttpContext) {
    const client = await this.#findScoped(params.id, agencyId!)
    const recto = this.#uploads.validateFile(request.file('recto'), 'Permis recto')
    const verso = this.#uploads.validateFile(request.file('verso'), 'Permis verso')

    if (!recto && !verso) {
      throw new Exception('Ajoutez au moins une pièce jointe (recto ou verso).', {
        status: 422,
        code: 'E_LICENSE_FILES_REQUIRED',
      })
    }

    if (recto) {
      const previous = client.licenseRectoPath
      client.licenseRectoPath = await this.#uploads.store(recto, client.id, 'recto')
      await this.#uploads.removeIfExists(previous)
    }

    if (verso) {
      const previous = client.licenseVersoPath
      client.licenseVersoPath = await this.#uploads.store(verso, client.id, 'verso')
      await this.#uploads.removeIfExists(previous)
    }

    await client.save()
    const serialized = await serialize(ClientTransformer.transform(client))
    return response.ok(withLicenseFlags(client, serialized))
  }

  async licenseFile({ params, response, agencyId }: HttpContext) {
    const client = await this.#findScoped(params.id, agencyId!)
    const side = String(params.side)
    if (side !== 'recto' && side !== 'verso') {
      throw new Exception('Côté invalide.', { status: 404, code: 'E_LICENSE_SIDE' })
    }

    const relativePath = side === 'recto' ? client.licenseRectoPath : client.licenseVersoPath
    if (!relativePath) {
      throw new Exception('Pièce jointe introuvable.', { status: 404, code: 'E_LICENSE_MISSING' })
    }

    const absolutePath = this.#uploads.absolutePath(relativePath)
    try {
      await access(absolutePath)
    } catch {
      throw new Exception('Fichier introuvable sur le serveur.', {
        status: 404,
        code: 'E_LICENSE_FILE_MISSING',
      })
    }

    const ext = relativePath.split('.').pop()?.toLowerCase()
    const contentType =
      ext === 'pdf'
        ? 'application/pdf'
        : ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/jpeg'

    response.header('Content-Type', contentType)
    response.header('Content-Disposition', `inline; filename="permis-${side}-${client.id}.${ext}"`)
    return response.stream(createReadStream(absolutePath))
  }

  async destroy({ params, response, agencyId }: HttpContext) {
    const client = await this.#findScoped(params.id, agencyId!)
    await this.#uploads.removeIfExists(client.licenseRectoPath)
    await this.#uploads.removeIfExists(client.licenseVersoPath)
    await client.delete()
    return response.ok({ message: 'Client supprimé.' })
  }
}
