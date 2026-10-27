import { mkdir, unlink, access } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import { Exception } from '@adonisjs/core/exceptions'
import type { MultipartFile } from '@adonisjs/bodyparser/types'
import type { HttpContext } from '@adonisjs/core/http'
import {
  INCOMING_IMAGE_BYTES,
  INCOMING_IMAGE_LABEL,
  writeCompressedImage,
} from '#services/image_compress_service'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
/** Taille max bannière : 1,5 Mo */
export const MAX_BANNER_BYTES = 1536 * 1024
export const MAX_BANNER_LABEL = '1,5 Mo'

function isSizeError(file: MultipartFile) {
  return file.errors.some(
    (error) => error.type === 'size' || /size|volumineux|large|limit/i.test(error.message)
  )
}

function contentTypeForPath(relativePath: string) {
  const ext = relativePath.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

export default class BannerUploadService {
  storageDir() {
    return app.makePath('storage/uploads/banners')
  }

  absolutePath(relativePath: string) {
    return app.makePath(relativePath)
  }

  async ensureStorage() {
    await mkdir(this.storageDir(), { recursive: true })
  }

  #tooLarge() {
    return new Exception(
      `Bannière : l’image dépasse ${INCOMING_IMAGE_LABEL}. Choisissez une image plus légère (max ${INCOMING_IMAGE_LABEL}, réduite automatiquement sous ${MAX_BANNER_LABEL}).`,
      {
        status: 422,
        code: 'E_BANNER_IMAGE_TOO_LARGE',
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
      throw new Exception(`Bannière : ${detail || 'fichier invalide.'}`, {
        status: 422,
        code: 'E_INVALID_BANNER_IMAGE',
      })
    }

    const ext = (file.extname || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Exception('Bannière : format non autorisé (JPG, PNG ou WEBP).', {
        status: 422,
        code: 'E_BANNER_IMAGE_TYPE',
      })
    }

    return file
  }

  async store(file: MultipartFile, bannerId: number) {
    await this.ensureStorage()
    if (!file.isValid || !file.tmpPath) {
      throw new Exception('Impossible d’enregistrer l’image de la bannière.', {
        status: 500,
        code: 'E_BANNER_IMAGE_UPLOAD_FAILED',
      })
    }

    const fileName = `banner-${bannerId}-${Date.now()}.jpg`
    const destination = join(this.storageDir(), fileName)
    try {
      await writeCompressedImage(file.tmpPath, destination, {
        maxWidth: 1920,
        maxBytes: MAX_BANNER_BYTES,
        format: 'jpeg',
      })
    } catch (error) {
      await unlink(destination).catch(() => {})
      if (error instanceof Error && error.message === 'IMAGE_STILL_TOO_LARGE') {
        throw this.#tooLarge()
      }
      throw new Exception('Impossible d’enregistrer l’image de la bannière.', {
        status: 500,
        code: 'E_BANNER_IMAGE_UPLOAD_FAILED',
      })
    }

    return `storage/uploads/banners/${fileName}`
  }

  async removeIfExists(relativePath: string | null | undefined) {
    if (!relativePath) return
    try {
      await unlink(this.absolutePath(relativePath))
    } catch {
      // ignore missing files
    }
  }

  async streamFile(response: HttpContext['response'], relativePath: string, cachePublic = false) {
    const absolutePath = this.absolutePath(relativePath)
    try {
      await access(absolutePath)
    } catch {
      throw new Exception('Image de bannière introuvable.', {
        status: 404,
        code: 'E_BANNER_IMAGE_MISSING',
      })
    }

    response.header('Content-Type', contentTypeForPath(relativePath))
    response.header(
      'Cache-Control',
      cachePublic ? 'public, max-age=3600' : 'private, max-age=3600'
    )
    return response.stream(createReadStream(absolutePath))
  }
}
