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

/** Logo affiché en 36 pt dans les PDF : 150 px suffisent, transparence conservée. */
export async function preparePdfLogo(absolutePath: string | null): Promise<Buffer | null> {
  if (!absolutePath) return null
  try {
    return await sharp(absolutePath, { failOn: 'none' })
      .rotate()
      .resize(150, 150, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer()
  } catch {
    return null
  }
}
