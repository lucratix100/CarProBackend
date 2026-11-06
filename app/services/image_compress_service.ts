import { copyFile, stat, writeFile } from 'node:fs/promises'
import { extname } from 'node:path'
import sharp from 'sharp'

/** Taille max acceptée à l’arrivée, avant réduction. Le fichier stocké reste sous la limite métier. */
export const INCOMING_IMAGE_BYTES = 4 * 1024 * 1024
export const INCOMING_IMAGE_LABEL = '4 Mo'

export type ImageCompressOptions = {
  maxWidth: number
  maxBytes: number
  format: 'jpeg' | 'png'
}

function isJpegExt(ext: string) {
  return ext === '.jpg' || ext === '.jpeg'
}

/**
 * Écrit une version réduite de l’image. Lève IMAGE_STILL_TOO_LARGE si le
 * résultat dépasse maxBytes.
 */
export async function writeCompressedImage(
  sourcePath: string,
  destinationPath: string,
  options: ImageCompressOptions
): Promise<void> {
  const sourceStat = await stat(sourcePath)
  const meta = await sharp(sourcePath, { failOn: 'none' }).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  const sourceExt = extname(sourcePath).toLowerCase()
  const formatMatches =
    options.format === 'png' ? sourceExt === '.png' : isJpegExt(sourceExt)
  const alreadyFits =
    formatMatches &&
    sourceStat.size <= options.maxBytes &&
    width > 0 &&
    height > 0 &&
    width <= options.maxWidth &&
    height <= options.maxWidth

  if (alreadyFits) {
    await copyFile(sourcePath, destinationPath)
    return
  }

  let targetWidth = options.maxWidth
  let quality = 82
  let last: Buffer | null = null

  for (let attempt = 0; attempt < 8; attempt++) {
    const pipeline = sharp(sourcePath, { failOn: 'none' }).rotate().resize({
      width: targetWidth,
      height: targetWidth,
      fit: 'inside',
      withoutEnlargement: true,
    })

    const encoded =
      options.format === 'png'
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.jpeg({ quality }).toBuffer()

    last = encoded
    if (encoded.length <= options.maxBytes) break

    if (options.format === 'jpeg' && quality > 50) {
      quality -= 8
    } else {
      targetWidth = Math.max(64, Math.round(targetWidth * 0.8))
    }
  }

  if (!last || last.length > options.maxBytes) {
    throw new Error('IMAGE_STILL_TOO_LARGE')
  }

  await writeFile(destinationPath, last)
}

/** Logo affiché ~52 pt dans les PDF : 220 px pour un rendu net. */
export async function preparePdfLogo(absolutePath: string | null): Promise<Buffer | null> {
  if (!absolutePath) return null
  try {
    return await sharp(absolutePath, { failOn: 'none' })
      .rotate()
      .resize(220, 220, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer()
  } catch {
    return null
  }
}

/**
 * Rend les pixels clairs (fond blanc / gris papier) transparents pour une
 * signature manuscrite scannée, tout en conservant l’alpha déjà présent.
 */
function stripLightBackground(data: Buffer) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const a = data[i + 3]!
    if (a === 0) continue

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const brightness = (r + g + b) / 3
    const nearGray = max - min < 28

    if (nearGray && brightness >= 245) {
      data[i + 3] = 0
    } else if (nearGray && brightness >= 210) {
      const fade = (brightness - 210) / 35
      data[i + 3] = Math.max(0, Math.round(a * (1 - fade)))
    }
  }
}

/**
 * Enregistre une signature en PNG transparent : fond clair retiré, alpha
 * préservé, dimensions réduites pour les cases du contrat PDF.
 */
export async function writeTransparentSignaturePng(
  sourcePath: string,
  destinationPath: string,
  options: { maxWidth: number; maxBytes: number }
): Promise<void> {
  let targetWidth = options.maxWidth
  let last: Buffer | null = null

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, info } = await sharp(sourcePath, { failOn: 'none' })
      .rotate()
      .resize({
        width: targetWidth,
        height: Math.round(targetWidth * 0.55),
        fit: 'inside',
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    stripLightBackground(data)

    const encoded = await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png({ compressionLevel: 9 })
      .toBuffer()

    last = encoded
    if (encoded.length <= options.maxBytes) break
    targetWidth = Math.max(96, Math.round(targetWidth * 0.8))
  }

  if (!last || last.length > options.maxBytes) {
    throw new Error('IMAGE_STILL_TOO_LARGE')
  }

  await writeFile(destinationPath, last)
}

/** Signature ~box PDF (~120–160 pt) : 360 px de large pour un rendu net. */
export async function preparePdfSignature(absolutePath: string | null): Promise<Buffer | null> {
  if (!absolutePath) return null
  try {
    const { data, info } = await sharp(absolutePath, { failOn: 'none' })
      .rotate()
      .resize(360, 160, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    stripLightBackground(data)

    return await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png({ compressionLevel: 9 })
      .toBuffer()
  } catch {
    return null
  }
}
