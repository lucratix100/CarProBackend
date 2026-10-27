import { mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import { Exception } from '@adonisjs/core/exceptions'
import type { MultipartFile } from '@adonisjs/bodyparser/types'
import {
  INCOMING_IMAGE_BYTES,
  INCOMING_IMAGE_LABEL,
  writeCompressedImage,
} from '#services/image_compress_service'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
/** Taille max par image : 800 Ko */
export const MAX_IMAGE_BYTES = 800 * 1024
export const MAX_IMAGE_LABEL = '800 Ko'
export const VEHICLE_PHOTOS_MIN = 3
export const VEHICLE_PHOTOS_MAX = 5

function isSizeError(file: MultipartFile) {
  return file.errors.some(
    (error) =>
      error.type === 'size' ||
      /size|volumineux|large|limit/i.test(error.message)
  )
}

export default class VehiclePhotoUploadService {
  storageDir() {
    return app.makePath('storage/uploads/vehicles')
  }

  absolutePath(relativePath: string) {
    return app.makePath(relativePath)
  }

  async ensureStorage() {
    await mkdir(this.storageDir(), { recursive: true })
  }

  #tooLarge(label: string) {
    return new Exception(
      `${label} : l’image dépasse ${INCOMING_IMAGE_LABEL}. Choisissez une photo plus légère (max ${INCOMING_IMAGE_LABEL} par fichier, réduite automatiquement à ${MAX_IMAGE_LABEL}).`,
      {
        status: 422,
        code: 'E_VEHICLE_PHOTO_TOO_LARGE',
      }
    )
  }

  validateFile(file: MultipartFile | null, label = 'Photo') {
    if (!file) return null

    if (typeof file.size === 'number' && file.size > INCOMING_IMAGE_BYTES) {
      throw this.#tooLarge(label)
    }

    file.sizeLimit = INCOMING_IMAGE_BYTES
    file.allowedExtensions = ALLOWED_EXTENSIONS
    file.validate()

    if (!file.isValid) {
      if (isSizeError(file) || (typeof file.size === 'number' && file.size > INCOMING_IMAGE_BYTES)) {
        throw this.#tooLarge(label)
      }
      const detail = file.errors.map((e) => e.message).join(' ')
      throw new Exception(`${label} : ${detail || 'fichier invalide.'}`, {
        status: 422,
        code: 'E_INVALID_VEHICLE_PHOTO',
      })
    }

    if (typeof file.size === 'number' && file.size > INCOMING_IMAGE_BYTES) {
      throw this.#tooLarge(label)
    }

    const ext = (file.extname || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Exception(`${label} : format non autorisé (JPG, PNG ou WEBP).`, {
        status: 422,
        code: 'E_VEHICLE_PHOTO_TYPE',
      })
    }

    return file
  }

  async store(file: MultipartFile, vehicleId: number, position: number) {
    await this.ensureStorage()
    if (!file.isValid || !file.tmpPath) {
      throw new Exception('Impossible d’enregistrer la photo du véhicule.', {
        status: 500,
        code: 'E_VEHICLE_PHOTO_UPLOAD_FAILED',
      })
    }

    const fileName = `vehicle-${vehicleId}-${position}-${Date.now()}.jpg`
    const destination = join(this.storageDir(), fileName)
    try {
      await writeCompressedImage(file.tmpPath, destination, {
        maxWidth: 1600,
        maxBytes: MAX_IMAGE_BYTES,
        format: 'jpeg',
      })
    } catch (error) {
      await unlink(destination).catch(() => {})
      if (error instanceof Error && error.message === 'IMAGE_STILL_TOO_LARGE') {
        throw this.#tooLarge('Photo')
      }
      throw new Exception('Impossible d’enregistrer la photo du véhicule.', {
        status: 500,
        code: 'E_VEHICLE_PHOTO_UPLOAD_FAILED',
      })
    }

    return `storage/uploads/vehicles/${fileName}`
  }

  async removeIfExists(relativePath: string | null | undefined) {
    if (!relativePath) return
    try {
      await unlink(this.absolutePath(relativePath))
    } catch {
      // ignore missing files
    }
  }
}
