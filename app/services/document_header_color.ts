export const DEFAULT_HEADER_COLOR = '#0f4a42'

const HEX = /^#([0-9a-fA-F]{6})$/

export function normalizeHeaderColor(value: string | null | undefined) {
  if (!value) return DEFAULT_HEADER_COLOR
  const trimmed = value.trim()
  return HEX.test(trimmed) ? trimmed.toLowerCase() : DEFAULT_HEADER_COLOR
}

function rgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

function toHex(r: number, g: number, b: number) {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

function mix(base: string, target: string, amount: number) {
  const from = rgb(base)
  const to = rgb(target)
  return toHex(
    from.r + (to.r - from.r) * amount,
    from.g + (to.g - from.g) * amount,
    from.b + (to.b - from.b) * amount
  )
}

function luminance(hex: string) {
  const { r, g, b } = rgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

export type DocumentTheme = {
  background: string
  ink: string
  muted: string
  badge: string
  badgeInk: string
  /** Couleur d’accent pour titres, lignes et pastilles du corps. */
  accent: string
  /** Fond teinté pour blocs et lignes mises en avant. */
  accentSoft: string
}

export function headerTheme(value: string | null | undefined): DocumentTheme {
  const background = normalizeHeaderColor(value)
  const light = luminance(background) > 0.62
  const badge = light ? mix(background, '#000000', 0.16) : mix(background, '#ffffff', 0.16)
  return {
    background,
    ink: light ? '#0f172a' : '#ffffff',
    muted: light ? mix(background, '#0f172a', 0.55) : mix(background, '#ffffff', 0.72),
    badge,
    badgeInk: luminance(badge) > 0.62 ? '#0f172a' : '#ffffff',
    accent: background,
    accentSoft: mix(background, '#ffffff', 0.9),
  }
}
