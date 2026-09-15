import { mkdir, unlink, access } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import app from '@adonisjs/core/services/app'
import { Exception } from '@adonisjs/core/exceptions'
import type { MultipartFile } from '@adonisjs/bodyparser/types'
import type { HttpContext } from '@adonisjs/core/http'
import type Agency from '#models/agency'
import type Setting from '#models/setting'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
/** Taille max logo : 500 Ko */
export const MAX_LOGO_BYTES = 500 * 1024
export const MAX_LOGO_LABEL = '500 Ko'

export type AgencyLogoStatus = 'none' | 'pending' | 'approved' | 'rejected'

function isSizeError(file: MultipartFile) {
  return file.errors.some(
    (error) =>
      error.type === 'size' ||
      /size|volumineux|large|limit/i.test(error.message)
  )
}

function contentTypeForPath(relativePath: string) {
  const ext = relativePath.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

export function agencyLogoStatus(settings: Setting): AgencyLogoStatus {
  if (settings.logoPendingPath) return 'pending'
  if (settings.logoPath) return 'approved'
  if (settings.logoRejectionReason) return 'rejected'
  return 'none'
}

/** Logo visible publiquement (contrats, marketplace, etc.). */
export function resolvePublicLogoPath(agency: Agency, settings: Setting): string | null {
  if (!agency.canUseCustomLogo || !settings.logoPath) return null
  return settings.logoPath
}

export function marketplaceLogoUrl(agency: Agency, settings: Setting): string | null {
  if (!resolvePublicLogoPath(agency, settings)) return null
  return `/api/v1/marketplace/agencies/${agency.id}/logo`
}

export default class AgencyLogoUploadService {
  storageDir() {
    return app.makePath('storage/uploads/logos')
  }

  absolutePath(relativePath: string) {
    return app.makePath(relativePath)
  }

  async ensureStorage() {
    await mkdir(this.storageDir(), { recursive: true })
  }

  #tooLarge() {
    return new Exception(
      `Logo : l’image dépasse ${MAX_LOGO_LABEL}. Compressez-la (max ${MAX_LOGO_LABEL}).`,
      {
        status: 422,
        code: 'E_AGENCY_LOGO_TOO_LARGE',
      }
    )
  }

  validateFile(file: MultipartFile | null) {
    if (!file) return null

    if (typeof file.size === 'number' && file.size > MAX_LOGO_BYTES) {
      throw this.#tooLarge()
    }

    file.sizeLimit = MAX_LOGO_BYTES
    file.allowedExtensions = ALLOWED_EXTENSIONS
    file.validate()

    if (!file.isValid) {
      if (isSizeError(file) || (typeof file.size === 'number' && file.size > MAX_LOGO_BYTES)) {
        throw this.#tooLarge()
      }
      const detail = file.errors.map((e) => e.message).join(' ')
      throw new Exception(`Logo : ${detail || 'fichier invalide.'}`, {
        status: 422,
        code: 'E_INVALID_AGENCY_LOGO',
      })
    }

    const ext = (file.extname || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Exception('Logo : format non autorisé (JPG, PNG ou WEBP).', {
        status: 422,
        code: 'E_AGENCY_LOGO_TYPE',
      })
    }

    return file
  }

  async store(file: MultipartFile, agencyId: number) {
    await this.ensureStorage()
    const ext = (file.extname || 'png').toLowerCase()
    const fileName = `agency-${agencyId}-${Date.now()}.${ext}`
    await file.move(this.storageDir(), { name: fileName, overwrite: true })

    if (!file.isValid || file.errors.length) {
      throw new Exception('Impossible d’enregistrer le logo.', {
        status: 500,
        code: 'E_AGENCY_LOGO_UPLOAD_FAILED',
      })
    }

    return `storage/uploads/logos/${fileName}`
  }

  async removeIfExists(relativePath: string | null | undefined) {
    if (!relativePath) return
    try {
      await unlink(this.absolutePath(relativePath))
    } catch {
      // ignore missing files
    }
  }

  async streamFile(response: HttpContext['response'], relativePath: string) {
    const absolutePath = this.absolutePath(relativePath)
    try {
      await access(absolutePath)
    } catch {
      throw new Exception('Logo introuvable sur le serveur.', {
        status: 404,
        code: 'E_AGENCY_LOGO_MISSING',
      })
    }

    response.header('Content-Type', contentTypeForPath(relativePath))
    response.header('Cache-Control', 'private, max-age=3600')
    return response.stream(createReadStream(absolutePath))
  }
}
