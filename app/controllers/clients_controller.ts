import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import ClientLicenseUploadService from '#services/client_license_upload_service'
import IdentityScanService from '#services/identity_scan_service'
import ClientTransformer from '#transformers/client_transformer'
import { createClientValidator, updateClientValidator } from '#validators/client'
import AuditService, { diffValues, pickAuditFields } from '#services/audit_service'
import ValidationService, { pendingValidationResponse } from '#services/validation_service'

const CLIENT_AUDIT_FIELDS = [
  'fullName',
  'phone',
  'email',
  'licenseNumber',
  'idCardNumber',
  'city',
  'type',
  'notes',
  'isActive',
] as const

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
  #identityScan = new IdentityScanService()
  #audit = new AuditService()
  #validation = new ValidationService()

  async #findScoped(id: number | string, agencyId: number) {
    return Client.query().where('id', id).where('agencyId', agencyId).firstOrFail()
  }

  async #withActors(client: Client, serialized: unknown) {
    await client.load('createdBy')
    await client.load('updatedBy')
    const base = withLicenseFlags(client, serialized)
    return {
      ...base,
      createdBy: client.createdBy
        ? { id: client.createdBy.id, fullName: client.createdBy.fullName }
        : null,
      updatedBy: client.updatedBy
        ? { id: client.updatedBy.id, fullName: client.updatedBy.fullName }
        : null,
    }
  }

  /**
   * Analyse OCR / MRZ d’une pièce d’identité ou d’un permis.
   * Ne crée pas le client — retourne les champs pour vérification humaine.
   */
  async scanIdentity({ request }: HttpContext) {
    const file = this.#identityScan.validateScanFile(request.file('file'))
    const result = await this.#identityScan.scanFile(file)

    if (result.warnings.includes('unreadable') && !result.fields.fullName) {
      throw new Exception('Photo illisible. Veuillez reprendre la photo.', {
        status: 422,
        code: 'E_SCAN_UNREADABLE',
      })
    }

    return result
  }

  /**
   * Recherche anti-doublon par n° de pièce et/ou n° de permis (scopé agence).
   */
  async lookup({ request, serialize, agencyId }: HttpContext) {
    const idCardNumber = String(request.input('idCardNumber') || '')
      .trim()
      .toUpperCase()
    const licenseNumber = String(request.input('licenseNumber') || '')
      .trim()
      .toUpperCase()

    if (!idCardNumber && !licenseNumber) {
      throw new Exception('Indiquez un n° de pièce ou un n° de permis.', {
        status: 422,
        code: 'E_LOOKUP_EMPTY',
      })
    }

    const query = Client.query().where('agencyId', agencyId!)
    query.where((builder) => {
      if (idCardNumber) {
        builder.orWhereRaw('UPPER(TRIM(id_card_number)) = ?', [idCardNumber])
      }
      if (licenseNumber) {
        builder.orWhereRaw('UPPER(TRIM(license_number)) = ?', [licenseNumber])
      }
    })

    const client = await query.orderBy('id', 'desc').first()
    if (!client) {
      return { found: false, client: null }
    }

    const serialized = await serialize(ClientTransformer.transform(client))
    return {
      found: true,
      client: withLicenseFlags(client, serialized),
      message: 'Ce client existe déjà dans la base Profil Car Service.',
    }
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
          .orWhereILike('idCardNumber', `%${q}%`)
          .orWhereILike('licenseNumber', `%${q}%`)
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

  async store({ request, response, serialize, agencyId, auth }: HttpContext) {
    const payload = await request.validateUsing(createClientValidator)
    const user = auth.use('api').getUserOrFail()
    const client = await Client.create({
      agencyId: agencyId!,
      source: 'agency',
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email ?? null,
      licenseNumber: payload.licenseNumber ?? null,
      licenseExpiresAt: toDate(payload.licenseExpiresAt) ?? null,
      idCardNumber: payload.idCardNumber ?? null,
      city: payload.city ?? null,
      birthDate: toDate(payload.birthDate) ?? null,
      type: payload.type ?? 'particulier',
      notes: payload.notes ?? null,
      isActive: payload.isActive ?? true,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    })
    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'client.create',
      module: 'clients',
      entityType: 'client',
      entityId: client.id,
      clientId: client.id,
      newValues: pickAuditFields(
        client as unknown as Record<string, unknown>,
        [...CLIENT_AUDIT_FIELDS]
      ),
      summary: `Création du client ${client.fullName}`,
      ip: request.ip(),
    })
    const serialized = await serialize(ClientTransformer.transform(client))
    return response.created(await this.#withActors(client, serialized))
  }

  async show({ params, serialize, agencyId }: HttpContext) {
    const client = await this.#findScoped(params.id, agencyId!)
    const serialized = await serialize(ClientTransformer.transform(client))
    return this.#withActors(client, serialized)
  }

  async update({ params, request, serialize, agencyId, auth }: HttpContext) {
    const client = await this.#findScoped(params.id, agencyId!)
    const payload = await request.validateUsing(updateClientValidator)
    const user = auth.use('api').getUserOrFail()
    const before = pickAuditFields(
      client as unknown as Record<string, unknown>,
      [...CLIENT_AUDIT_FIELDS]
    )

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
      updatedByUserId: user.id,
    })

    if (payload.birthDate !== undefined) {
      client.birthDate = toDate(payload.birthDate) ?? null
    }

    if (payload.licenseExpiresAt !== undefined) {
      client.licenseExpiresAt = toDate(payload.licenseExpiresAt) ?? null
    }

    await client.save()

    const after = pickAuditFields(
      client as unknown as Record<string, unknown>,
      [...CLIENT_AUDIT_FIELDS]
    )
    const diff = diffValues(before, after)
    if (diff) {
      await this.#audit.log({
        actor: user,
        agencyId: agencyId!,
        action: 'client.update',
        module: 'clients',
        entityType: 'client',
        entityId: client.id,
        clientId: client.id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        summary: `Modification du client ${client.fullName}`,
        ip: request.ip(),
      })
    }

    const serialized = await serialize(ClientTransformer.transform(client))
    return this.#withActors(client, serialized)
  }

  async uploadLicense({ params, request, response, serialize, agencyId, auth }: HttpContext) {
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

    const user = auth.use('api').getUserOrFail()
    client.updatedByUserId = user.id
    await client.save()

    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'client.identity_upload',
      module: 'clients',
      entityType: 'client',
      entityId: client.id,
      clientId: client.id,
      newValues: {
        recto: Boolean(recto),
        verso: Boolean(verso),
      },
      summary: `Pièce d’identité mise à jour — ${client.fullName}`,
      ip: request.ip(),
    })

    const serialized = await serialize(ClientTransformer.transform(client))
    return response.ok(await this.#withActors(client, serialized))
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

  async destroy({ params, response, agencyId, auth, request }: HttpContext) {
    const client = await this.#findScoped(params.id, agencyId!)
    const user = auth.use('api').getUserOrFail()
    const snapshot = {
      fullName: client.fullName,
      phone: client.phone,
      email: client.email,
    }
    const clientId = client.id

    const gate = await this.#validation.gate({
      agencyId: agencyId!,
      actor: user,
      actionCode: 'clients.delete',
      module: 'clients',
      entityType: 'client',
      entityId: clientId,
      clientId,
      oldValues: snapshot,
      newValues: null,
      payload: {},
      summary: `Suppression du client ${snapshot.fullName}`,
      ip: request.ip(),
    })
    if (gate.outcome === 'pending') {
      return pendingValidationResponse(gate.request)
    }

    await this.#uploads.removeIfExists(client.licenseRectoPath)
    await this.#uploads.removeIfExists(client.licenseVersoPath)
    await client.delete()
    await this.#audit.log({
      actor: user,
      agencyId: agencyId!,
      action: 'client.delete',
      module: 'clients',
      entityType: 'client',
      entityId: clientId,
      clientId,
      oldValues: snapshot,
      summary: `Suppression du client ${snapshot.fullName}`,
      ip: request.ip(),
    })

    if (gate.mode === 'notify') {
      await this.#validation.notifyAfterProceed({
        agencyId: agencyId!,
        actor: user,
        actionCode: 'clients.delete',
        module: 'clients',
        summary: `Suppression du client ${snapshot.fullName}`,
        entityType: 'client',
        entityId: clientId,
        clientId,
      })
    }

    return response.ok({ message: 'Client supprimé.' })
  }
}
