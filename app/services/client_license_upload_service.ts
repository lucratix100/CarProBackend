import { mkdir, unlink } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import { Exception } from '@adonisjs/core/exceptions'
import type { MultipartFile } from '@adonisjs/bodyparser/types'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
/** Taille max par fichier image / PDF : 800 Ko */
export const MAX_IMAGE_BYTES = 800 * 1024
export const MAX_IMAGE_LABEL = '800 Ko'

function isSizeError(file: MultipartFile) {
  return file.errors.some(
    (error) =>
      error.type === 'size' ||
      /size|volumineux|large|limit/i.test(error.message)
  )
}

export default class ClientLicenseUploadService {
  storageDir() {
    return app.makePath('storage/uploads/licenses')
  }

  absolutePath(relativePath: string) {
    return app.makePath(relativePath)
  }

  async ensureStorage() {
    await mkdir(this.storageDir(), { recursive: true })
  }

  #tooLarge(label: string) {
    return new Exception(
      `${label} : le fichier dépasse ${MAX_IMAGE_LABEL}. Compressez-le ou choisissez un fichier plus léger (max ${MAX_IMAGE_LABEL}).`,
      {
        status: 422,
        code: 'E_LICENSE_FILE_TOO_LARGE',
      }
    )
  }

  validateFile(file: MultipartFile | null, label: string) {
    if (!file) return null

    if (typeof file.size === 'number' && file.size > MAX_IMAGE_BYTES) {
      throw this.#tooLarge(label)
    }

    file.sizeLimit = MAX_IMAGE_BYTES
    file.allowedExtensions = ALLOWED_EXTENSIONS
    file.validate()

    if (!file.isValid) {
      if (isSizeError(file) || (typeof file.size === 'number' && file.size > MAX_IMAGE_BYTES)) {
        throw this.#tooLarge(label)
      }
      const detail = file.errors.map((e) => e.message).join(' ')
      throw new Exception(`${label} : ${detail || 'fichier invalide.'}`, {
        status: 422,
        code: 'E_INVALID_LICENSE_FILE',
      })
    }

    if (typeof file.size === 'number' && file.size > MAX_IMAGE_BYTES) {
      throw this.#tooLarge(label)
    }

    const ext = (file.extname || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Exception(`${label} : format non autorisé (JPG, PNG, WEBP ou PDF).`, {
        status: 422,
        code: 'E_LICENSE_FILE_TYPE',
      })
    }

    return file
  }

  async store(file: MultipartFile, clientId: number, side: 'recto' | 'verso') {
    await this.ensureStorage()
    const ext = (file.extname || 'bin').toLowerCase()
    const fileName = `client-${clientId}-${side}-${Date.now()}.${ext}`
    await file.move(this.storageDir(), { name: fileName, overwrite: true })

    if (!file.isValid || file.errors.length) {
      throw new Exception(`Impossible d’enregistrer le ${side} du permis.`, {
        status: 500,
        code: 'E_LICENSE_UPLOAD_FAILED',
      })
    }

    return `storage/uploads/licenses/${fileName}`
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
