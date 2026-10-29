import app from '@adonisjs/core/services/app'
import { preparePdfLogo } from '#services/image_compress_service'

/** Pastille carrée (M) pour en-têtes PDF / documents. */
export function defaultBrandMarkAbsolutePath() {
  return app.makePath('resources/brand/mobiprofil-mark.jpg')
}

/**
 * Charge le logo agence s’il existe, sinon le logo mobiprofil par défaut.
 */
export async function resolvePdfLogoBuffer(
  customAbsolutePath: string | null | undefined
): Promise<Buffer | null> {
  const custom = await preparePdfLogo(customAbsolutePath ?? null)
  if (custom) return custom
  return preparePdfLogo(defaultBrandMarkAbsolutePath())
}
