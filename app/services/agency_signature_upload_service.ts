import { mkdir, unlink, access } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import { Exception } from '@adonisjs/core/exceptions'
import type { MultipartFile } from '@adonisjs/bodyparser/types'
import type { HttpContext } from '@adonisjs/core/http'
import type Agency from '#models/agency'
import type Setting from '#models/setting'
import {
  INCOMING_IMAGE_BYTES,
  INCOMING_IMAGE_LABEL,
  writeTransparentSignaturePng,
} from '#services/image_compress_service'

const ALLOWED_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg']
/** Taille max signature stockée : 400 Ko */
export const MAX_SIGNATURE_BYTES = 400 * 1024
export const MAX_SIGNATURE_LABEL = '400 Ko'

export type AgencySignatureStatus = 'none' | 'pending' | 'approved' | 'rejected'

export function agencySignatureStatus(settings: Setting): AgencySignatureStatus {
  if (settings.signaturePendingPath) return 'pending'
  if (settings.signaturePath) return 'approved'
  if (settings.signatureRejectionReason) return 'rejected'
  return 'none'
}

/** Signature visible sur les contrats (approuvée + autorisée). */
export function resolvePublicSignaturePath(
  agency: Agency,
  settings: Setting
): string | null {
  if (!agency.canUseCustomSignature || !settings.signaturePath) return null
  return settings.signaturePath
}

function isSizeError(file: MultipartFile) {
  return file.errors.some(
    (error) =>
      error.type === 'size' ||
      /size|volumineux|large|limit/i.test(error.message)
  )
}

export default class AgencySignatureUploadService {
  storageDir() {
    return app.makePath('storage/uploads/signatures')
  }

  absolutePath(relativePath: string) {
    return app.makePath(relativePath)
  }

  async ensureStorage() {
    await mkdir(this.storageDir(), { recursive: true })
  }

  #tooLarge() {
    return new Exception(
      `Signature : l’image dépasse ${INCOMING_IMAGE_LABEL}. Choisissez une image plus légère (max ${INCOMING_IMAGE_LABEL}, réduite automatiquement à ${MAX_SIGNATURE_LABEL}).`,
      {
        status: 422,
        code: 'E_AGENCY_SIGNATURE_TOO_LARGE',
      }
    )
  }

  validateFile(file: MultipartFile | null) {
    if (!file) return null

    if (typeof file.size === 'number' && file.size > INCOMING_IMAGE_BYTES) {
      throw this.#tooLarge()
    }

    file.sizeLimit = INCOMING_IMAGE_BYTES
    file.allowedExtensions = ALLOWED_EXTENSIONS
    file.validate()

    if (!file.isValid) {
      if (isSizeError(file) || (typeof file.size === 'number' && file.size > INCOMING_IMAGE_BYTES)) {
        throw this.#tooLarge()
      }
      const detail = file.errors.map((e) => e.message).join(' ')
      throw new Exception(`Signature : ${detail || 'fichier invalide.'}`, {
        status: 422,
        code: 'E_INVALID_AGENCY_SIGNATURE',
      })
    }

    const ext = (file.extname || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Exception('Signature : format non autorisé (PNG recommandé, WEBP ou JPG).', {
        status: 422,
        code: 'E_AGENCY_SIGNATURE_TYPE',
      })
    }

    return file
  }

  async store(file: MultipartFile, agencyId: number) {
    await this.ensureStorage()
    if (!file.isValid || !file.tmpPath) {
      throw new Exception('Impossible d’enregistrer la signature.', {
        status: 500,
        code: 'E_AGENCY_SIGNATURE_UPLOAD_FAILED',
      })
    }

    const fileName = `agency-${agencyId}-${Date.now()}.png`
    const destination = join(this.storageDir(), fileName)
    try {
      await writeTransparentSignaturePng(file.tmpPath, destination, {
        maxWidth: 640,
        maxBytes: MAX_SIGNATURE_BYTES,
      })
    } catch (error) {
      await unlink(destination).catch(() => {})
      if (error instanceof Error && error.message === 'IMAGE_STILL_TOO_LARGE') {
        throw this.#tooLarge()
      }
      throw new Exception('Impossible d’enregistrer la signature.', {
        status: 500,
        code: 'E_AGENCY_SIGNATURE_UPLOAD_FAILED',
      })
    }

    return `storage/uploads/signatures/${fileName}`
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
      throw new Exception('Signature introuvable sur le serveur.', {
        status: 404,
        code: 'E_AGENCY_SIGNATURE_MISSING',
      })
    }

    response.header('Content-Type', 'image/png')
    response.header('Cache-Control', 'private, max-age=3600')
    return response.stream(createReadStream(absolutePath))
  }
}
