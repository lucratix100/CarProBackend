import { createWorker, PSM, type Worker } from 'tesseract.js'
import { parse as parseMrz } from 'mrz'
import { Exception } from '@adonisjs/core/exceptions'
import type { MultipartFile } from '@adonisjs/bodyparser/types'
import { readFile } from 'node:fs/promises'

export type IdentityDocumentType = 'cni' | 'passport' | 'driving_license' | 'unknown'

export type IdentityScanWarning =
  | 'unreadable'
  | 'low_confidence'
  | 'partial'
  | 'expired'
  | 'missing_required'
  | 'incoherent'

export type IdentityScanFields = {
  fullName: string | null
  birthDate: string | null
  idCardNumber: string | null
  licenseNumber: string | null
  licenseExpiresAt: string | null
  documentExpiresAt: string | null
  city: string | null
  nationality: string | null
  placeOfBirth: string | null
  licenseCategories: string | null
}

export type IdentityScanResult = {
  documentType: IdentityDocumentType
  confidence: number
  fields: IdentityScanFields
  fieldConfidence: Partial<Record<keyof IdentityScanFields, number>>
  warnings: IdentityScanWarning[]
  rawTextPreview: string
  usedMrz: boolean
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
/** Photos téléphone compressées : jusqu’à 4 Mo pour l’analyse OCR */
export const MAX_SCAN_BYTES = 4 * 1024 * 1024
export const MAX_SCAN_LABEL = '4 Mo'

const DATE_LABEL =
  /(?:date\s*(?:de\s*)?(?:naissance|birth|naiss)|née?\s*le|born|dob|né\(e\)\s*le)/i
const EXPIRY_LABEL =
  /(?:date\s*(?:d['’])?exp(?:iration)?|date\s*of\s*expiry|expire|valid(?:ité| until| thru)|valable\s*jusqu)/i
const ISSUE_LABEL =
  /(?:date\s*(?:de\s*)?d[ée]livrance|date\s*of\s*issue|issued)/i
const DOC_NUMBER_LABEL =
  /(?:n[°ºo.]?\s*(?:de\s*la\s*)?(?:carte|cni|cin|pi[eè]ce|document|passport|passeport|id)|identity\s*card\s*number|document\s*no|passport\s*no|num(?:[eé]ro)?\s*(?:de\s*)?(?:la\s*)?(?:carte|pi[eè]ce|cni|cin))/i
const LICENSE_NUMBER_LABEL =
  /(?:n[°o.]?\s*(?:de\s*)?permis|license\s*no|permis\s*n|dl\s*no|driving\s*licen[cs]e)/i
const PLACE_BIRTH_LABEL = /(?:lieu\s*de\s*naissance|place\s*of\s*birth|né\(e\)\s*à)/i
const NATIONALITY_LABEL = /(?:nationalité|nationality|citoyenneté)/i
const ADDRESS_LABEL = /(?:adresse(?:\s*du\s*domicile)?|address|residence)/i
const CATEGORY_LABEL = /(?:cat(?:égorie|egory)?(?:s)?|categories?)\s*[:.]?\s*([A-Z0-9\s,/+-]{1,20})/i

/** Labels « Prénoms » CNI CEDEAO — tolérant OCR (accents / espaces) */
const FIRST_NAME_LABEL =
  /(?:^|[\s|/])(?:pr[eéèê]?\s*n[o0]ms?|given\s*names?|first\s*names?|nomes?\s*pr[oó]prios?)\b/i
/**
 * Labels « Nom » — ne doit PAS matcher dans « Prénoms ».
 * Exige un séparateur avant « nom » (début de ligne, espace, /).
 */
const LAST_NAME_LABEL =
  /(?:^|[\s|/:(])(?:nom(?![eé]s?\b)|surname|family\s*name|apelido)\b/i

/** Variantes floues pour recherche globale dans le texte OCR */
const FIRST_NAME_FUZZY =
  /pr[eéèê]?\s*n[o0]m[s]?/i
const LAST_NAME_FUZZY =
  /(?:^|[\n\r|/])\s*nom(?![eé]s?\b)\b/im

const NAME_TOKEN = /[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ'\-]{1,}/
const NAME_LINE = /^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ'\-\s]{2,}$/

const TRANSLATION_ONLY =
  /^(?:given\s*names?|first\s*names?|surname|family\s*name|nomes?\s*pr[oó]prios?|apelidos?|identity\s*card(?:\s*number)?|date\s*of\s*(?:birth|expiry|issue)|place\s*of\s*birth|address|sexo|sex|height|taille)\s*$/i

const NOISE_LINE =
  /^(?:republique|république|senegal|sénégal|cedeao|ecowas|carte\s*d|identity\s*card|cart[aã]o|prod-?daf|centre\s*d|registration|sexo|sexe|sex\b|taille|height|cm\b)/i

let workerPromise: Promise<Worker> | null = null

function isSizeError(file: MultipartFile) {
  return file.errors.some(
    (error) =>
      error.type === 'size' ||
      /size|volumineux|large|limit/i.test(error.message)
  )
}

function emptyFields(): IdentityScanFields {
  return {
    fullName: null,
    birthDate: null,
    idCardNumber: null,
    licenseNumber: null,
    licenseExpiresAt: null,
    documentExpiresAt: null,
    city: null,
    nationality: null,
    placeOfBirth: null,
    licenseCategories: null,
  }
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function titleCaseName(value: string) {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`)
}

/** Prénoms + Nom → nom complet (ex. « Serigne Saliou Mbacke Ndiaye ») */
function composeFullName(firstNames: string | null, lastName: string | null): string | null {
  const first = firstNames ? normalizeSpaces(firstNames) : ''
  const last = lastName ? normalizeSpaces(lastName) : ''
  const combined = normalizeSpaces(`${first} ${last}`.trim())
  if (combined.length < 3) return null
  return sanitizeFullName(titleCaseName(combined))
}

function isLikelyPersonName(value: string): boolean {
  const v = normalizeSpaces(value)
  if (v.length < 2 || v.length > 80) return false
  if (/\d/.test(v)) return false
  if (NOISE_LINE.test(v)) return false
  if (TRANSLATION_ONLY.test(v)) return false
  // Rejets OCR fréquents près de « Sexe / Sex » ou hologrammes (ex. « Fs »)
  if (/^(?:sex|sexe|m|f|fs|mf|fm|xx|n\/?a)\b/i.test(v)) return false
  if (/^(?:date|lieu|adresse|national|carte|numero|numéro|n°)/i.test(v)) return false
  const letters = (v.match(/\p{L}/gu) || []).length
  if (letters < 2) return false
  // Fragment OCR trop court pour un nom de famille (ex. « Fs », « Il »)
  if (letters < 3 && !/\s/.test(v)) return false
  return /^[\p{L}'\-\s.]+$/u.test(v)
}

/** Nom de famille : un mot (ou composé) suffisamment fiable */
function isLikelyLastName(value: string): boolean {
  if (!isLikelyPersonName(value)) return false
  const v = normalizeSpaces(value)
  // Un vrai nom de famille a en général ≥ 3 lettres ; rejeter bruit 1–2 car.
  if ((v.match(/\p{L}/gu) || []).length < 3) return false
  if (/^(?:sex|sexe|given|surname|apelido)/i.test(v)) return false
  return true
}

function stripLabelPrefix(line: string, label: RegExp): string {
  const flags = label.flags.includes('g') ? label.flags : `${label.flags}g`
  const re = new RegExp(label.source, flags)
  const m = re.exec(line)
  if (!m) return normalizeSpaces(line)
  return normalizeSpaces(line.slice(m.index + m[0].length).replace(/^[\s:.\-–—|/]+/, ''))
}

/**
 * Extrait une valeur après un label (même ligne ou lignes suivantes),
 * en ignorant les traductions EN/PT sur la même ligne.
 */
function extractLabeledValue(
  text: string,
  label: RegExp,
  options?: { allowDigits?: boolean; maxLookahead?: number }
): string | null {
  const allowDigits = options?.allowDigits ?? true
  const maxLookahead = options?.maxLookahead ?? 3
  const lines = text.split(/\r?\n/).map((l) => normalizeSpaces(l)).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!label.test(line)) continue

    // Valeur après le label sur la même ligne (après éventuelles traductions)
    let after = stripLabelPrefix(line, label)
    // « Prénoms / Given names / Nomes » → enlever suites de labels bilingues
    after = after
      .replace(/^(?:given\s*names?|first\s*names?|nomes?\s*pr[oó]prios?|surname|family\s*name|apelidos?)\s*[/:|]?\s*/i, '')
      .replace(/^(?:identity\s*card\s*number|date\s*of\s*(?:birth|expiry|issue)|place\s*of\s*birth|address)\s*[/:|]?\s*/i, '')
      .trim()

    if (after.length >= 2 && (allowDigits || !/^\d/.test(after)) && !label.test(after)) {
      // Enlever enchaînement de traductions restantes (Surname / Apelido)
      let cleaned = after
      for (let k = 0; k < 4; k++) {
        const next = cleaned.replace(
          /^(?:given\s*names?|first\s*names?|nomes?\s*pr[oó]prios?|surname|family\s*name|apelidos?|identity\s*card\s*number|date\s*of\s*(?:birth|expiry|issue)|place\s*of\s*birth|address)\s*[/:|]?\s*/i,
          ''
        )
        if (next === cleaned) break
        cleaned = next.trim()
      }
      after = cleaned
      if (
        after.length >= 2 &&
        !TRANSLATION_ONLY.test(after) &&
        !NOISE_LINE.test(after) &&
        (allowDigits || isLikelyPersonName(after) || /^[\d\s]+$/.test(after))
      ) {
        return after
      }
    }

    for (let j = 1; j <= maxLookahead; j++) {
      const next = lines[i + j]
      if (!next) break
      if (label.test(next)) continue
      if (FIRST_NAME_LABEL.test(next) || LAST_NAME_LABEL.test(next)) break
      if (DATE_LABEL.test(next) || EXPIRY_LABEL.test(next) || ISSUE_LABEL.test(next)) break
      if (PLACE_BIRTH_LABEL.test(next) || DOC_NUMBER_LABEL.test(next) || ADDRESS_LABEL.test(next)) break
      if (TRANSLATION_ONLY.test(next)) continue
      if (NOISE_LINE.test(next) && !/\d{2}[-/.]\d{2}/.test(next)) continue
      if (/^(?:given\s*names?|surname|family\s*name|date\s*of|place\s*of|identity\s*card|nomes?|apelidos?)\b/i.test(next)) {
        continue
      }
      if (!allowDigits && /\d/.test(next) && !/[A-Za-zÀ-ÿ]{3,}/.test(next)) continue
      return next
    }
  }
  return null
}

/** YYMMDD → YYYY-MM-DD (siècle glissant : < 15 ans dans le futur = 2000+, sinon 1900+) */
function mrzDateToIso(yymmdd: string | null | undefined): string | null {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return null
  const yy = Number(yymmdd.slice(0, 2))
  const mm = yymmdd.slice(2, 4)
  const dd = yymmdd.slice(4, 6)
  const nowYy = new Date().getFullYear() % 100
  const century = yy <= nowYy + 15 ? 2000 : 1900
  const iso = `${century + yy}-${mm}-${dd}`
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return null
  return iso
}

function parseFlexibleDate(raw: string): string | null {
  const cleaned = raw.trim().replace(/\s+/g, ' ')
  const iso = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) {
    const y = iso[1]
    const m = iso[2].padStart(2, '0')
    const d = iso[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const dmy = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (dmy) {
    let y = dmy[3]
    if (y.length === 2) y = `${Number(y) > 30 ? 19 : 20}${y}`
    const d = dmy[1].padStart(2, '0')
    const m = dmy[2].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
}

function extractDateNearLabel(text: string, label: RegExp): string | null {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!label.test(line)) continue
    const same = line.match(/(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/)
    if (same?.[1]) {
      const parsed = parseFlexibleDate(same[1])
      if (parsed) return parsed
    }
    for (let j = 1; j <= 2; j++) {
      const next = lines[i + j]
      if (!next) break
      const m = next.match(/(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/)
      if (m?.[1]) {
        const parsed = parseFlexibleDate(m[1])
        if (parsed) return parsed
      }
    }
  }
  return null
}

function extractValueNearLabel(text: string, label: RegExp): string | null {
  return extractLabeledValue(text, label, { allowDigits: true })
}

/** N° CNI CEDEAO du type « 1 07 19970202 00099 6 » */
function extractSenegalCardNumber(text: string): string | null {
  const labeled = extractLabeledValue(text, DOC_NUMBER_LABEL, { allowDigits: true, maxLookahead: 4 })
  if (labeled) {
    const digits = labeled.replace(/[^\d]/g, '')
    if (digits.length >= 10 && digits.length <= 20) {
      return normalizeSpaces(labeled.replace(/[^\d\s]/g, ''))
    }
  }

  // Fallback : longue suite de chiffres typique CEDEAO
  const match = text.match(/\b(\d(?:[\s\-.]?\d){12,18})\b/)
  if (match?.[1]) {
    const digits = match[1].replace(/[^\d]/g, '')
    if (digits.length >= 14 && digits.length <= 20) {
      return normalizeSpaces(match[1].replace(/[^\d\s]/g, ''))
    }
  }
  return null
}

function isSenegalCedeaoCard(text: string): boolean {
  const upper = text.toUpperCase()
  return (
    /CEDEAO|ECOWAS|SENEGAL|SÉNÉGAL/.test(upper) &&
    /CARTE\s*D.?IDENTIT|IDENTITY\s*CARD|CNI/.test(upper)
  ) || /N[°ºO.]?\s*DE\s*LA\s*CARTE\s*D.?IDENTIT/i.test(text)
}

/**
 * Parseur dédié CNI CEDEAO Sénégal :
 * fullName = Prénoms + Nom
 * (ville et dates d’expiration / délivrance : non préremplies — saisie manuelle)
 */
function parseSenegalCedeaoFields(text: string): {
  fields: Partial<IdentityScanFields>
  confidence: Partial<Record<keyof IdentityScanFields, number>>
} {
  const fields: Partial<IdentityScanFields> = {}
  const confidence: Partial<Record<keyof IdentityScanFields, number>> = {}

  const { firstNames, lastName, score } = extractCedeaoFullNameParts(text)
  const fullName = composeFullName(firstNames, lastName)
  if (fullName) {
    fields.fullName = fullName
    confidence.fullName = score
  }

  const birth = extractDateNearLabel(text, DATE_LABEL)
  if (birth) {
    fields.birthDate = birth
    confidence.birthDate = 0.85
  }

  // Fallback date : première date JJ/MM/AAAA plausible (naissance) si label raté
  if (!fields.birthDate) {
    const allDates = [...text.matchAll(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/g)]
      .map((m) => parseFlexibleDate(m[1]))
      .filter((d): d is string => d != null && d < new Date().toISOString().slice(0, 10) && d > '1920-01-01')
    // Sur CNI : souvent 1re date = naissance, puis délivrance, puis expiration
    if (allDates[0]) {
      fields.birthDate = allDates[0]
      confidence.birthDate = 0.55
    }
  }

  const cardNo = extractSenegalCardNumber(text)
  if (cardNo) {
    fields.idCardNumber = cardNo
    confidence.idCardNumber = 0.85
  }

  const place = extractLabeledValue(text, PLACE_BIRTH_LABEL, { allowDigits: false })
  if (place && isLikelyPersonName(place) && (place.match(/\p{L}/gu) || []).length >= 3) {
    fields.placeOfBirth = titleCaseName(place)
    confidence.placeOfBirth = 0.75
  }

  fields.nationality = fields.nationality ?? 'Sénégalaise'
  confidence.nationality = 0.7

  return { fields, confidence }
}

/**
 * Extraction robuste Prénoms + Nom pour OCR bruité (hologrammes, reflets).
 */
function extractCedeaoFullNameParts(text: string): {
  firstNames: string | null
  lastName: string | null
  score: number
} {
  let firstNames: string | null = null
  let lastName: string | null = null
  let score = 0.5

  const rawFirst = extractLabeledValue(text, FIRST_NAME_LABEL, {
    allowDigits: false,
    maxLookahead: 5,
  })
  const rawLast = extractLabeledValue(text, LAST_NAME_LABEL, {
    allowDigits: false,
    maxLookahead: 5,
  })

  if (rawFirst && isLikelyPersonName(rawFirst)) {
    firstNames = cleanNameValue(rawFirst)
    score = 0.75
  }
  if (rawLast && isLikelyLastName(rawLast)) {
    lastName = cleanNameValue(rawLast)
    score = firstNames ? 0.9 : 0.7
  }

  if (!firstNames || !lastName) {
    const fuzzy = extractNamesByFuzzyLabels(text)
    if (!firstNames && fuzzy.first) {
      firstNames = fuzzy.first
      score = Math.max(score, 0.7)
    }
    if (!lastName && fuzzy.last) {
      lastName = fuzzy.last
      score = firstNames ? Math.max(score, 0.85) : Math.max(score, 0.65)
    }
  }

  if (firstNames && !lastName) {
    lastName = findLastNameAfterLabel(text)
    if (lastName) score = Math.max(score, 0.8)
  }

  if (!firstNames || !lastName) {
    const block = findNameBlockNearBirthDate(text)
    if (block) {
      if (!firstNames && block.first) {
        firstNames = block.first
        score = Math.max(score, 0.65)
      }
      if (!lastName && block.last) {
        lastName = block.last
        score = firstNames ? Math.max(score, 0.8) : Math.max(score, 0.6)
      }
    }
  }

  if (!firstNames) {
    const caps = findBestUppercaseNameLine(text)
    if (caps) {
      firstNames = caps
      score = Math.max(score, 0.55)
    }
  }

  if (firstNames && lastName && firstNames.toUpperCase() === lastName.toUpperCase()) {
    lastName = null
  }

  // Si le « nom » est collé dans les prénoms (une seule ligne 4 mots), séparer dernier mot
  if (firstNames && !lastName) {
    const parts = firstNames.split(/\s+/).filter(Boolean)
    if (parts.length >= 3) {
      const maybeLast = parts[parts.length - 1]
      if (isLikelyLastName(maybeLast)) {
        lastName = maybeLast
        firstNames = parts.slice(0, -1).join(' ')
        score = Math.max(score, 0.6)
      }
    }
  }

  return { firstNames, lastName, score }
}

function cleanNameValue(value: string): string {
  return normalizeSpaces(
    value
      .replace(/\b(?:sexe?|sex|m|f|taille|height|cm)\b/gi, ' ')
      .replace(/[^\p{L}'\-\s]/gu, ' ')
  )
}

/** Recherche globale même si les sauts de ligne OCR sont cassés. */
function extractNamesByFuzzyLabels(text: string): { first: string | null; last: string | null } {
  const flat = text.replace(/\r/g, '\n')
  let first: string | null = null
  let last: string | null = null

  const firstMatch = flat.match(
    new RegExp(
      `${FIRST_NAME_FUZZY.source}[^\\nA-ZÀ-Ü]{0,80}([\\n\\r:|/\\s]+|\\s+)(${NAME_TOKEN.source}(?:[\\s-]+${NAME_TOKEN.source}){0,4})`,
      'i'
    )
  )
  if (firstMatch?.[2]) {
    const candidate = cleanNameValue(firstMatch[2])
    if (isLikelyPersonName(candidate)) first = candidate
  }

  const lastMatch = flat.match(
    new RegExp(
      `${LAST_NAME_FUZZY.source}[^\\nA-ZÀ-Ü]{0,60}([\\n\\r:|/\\s]+|\\s+)(${NAME_TOKEN.source})`,
      'im'
    )
  )
  if (lastMatch?.[2]) {
    const candidate = cleanNameValue(lastMatch[2])
    if (isLikelyLastName(candidate)) last = candidate
  }

  return { first, last }
}

/**
 * Sur CNI CEDEAO : juste avant la date de naissance, souvent
 * SERIGNE SALIOU MBACKE
 * NDIAYE
 * 02/02/1997
 */
function findNameBlockNearBirthDate(text: string): { first: string | null; last: string | null } | null {
  const lines = text.split(/\r?\n/).map((l) => normalizeSpaces(l)).filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    if (!/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(lines[i])) continue
    // Ignorer si la ligne est clairement une autre date labelée expiration plus bas — on prend la 1re
    const caps: string[] = []
    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const line = lines[j]
      if (FIRST_NAME_FUZZY.test(line) || LAST_NAME_FUZZY.test(line)) continue
      if (DATE_LABEL.test(line) || TRANSLATION_ONLY.test(line) || NOISE_LINE.test(line)) {
        if (caps.length) break
        continue
      }
      if (/^(?:sexe|sex|taille|height|m|f)\b/i.test(line)) continue
      if (NAME_LINE.test(line) && isLikelyPersonName(line) && !/\d/.test(line)) {
        caps.unshift(cleanNameValue(line))
      } else if (caps.length) {
        break
      }
    }
    if (caps.length >= 2) {
      const last = caps[caps.length - 1]
      const firstParts = caps.slice(0, -1)
      // Dernière ligne = nom si un seul mot ; sinon tout en prénoms+nom collés
      if (!last.includes(' ') && isLikelyLastName(last)) {
        return { first: firstParts.join(' '), last }
      }
      return { first: caps.join(' '), last: null }
    }
    if (caps.length === 1 && caps[0].split(/\s+/).length >= 2) {
      return { first: caps[0], last: null }
    }
  }
  return null
}

function findBestUppercaseNameLine(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => normalizeSpaces(l))
    .filter((l) => l.length >= 6 && l.length <= 70)

  let best: string | null = null
  let bestScore = 0
  for (const line of lines) {
    if (!NAME_LINE.test(line)) continue
    if (NOISE_LINE.test(line) || TRANSLATION_ONLY.test(line)) continue
    if (/CEDEAO|SENEGAL|REPUBLIQUE|IDENTITY|CARTE/i.test(line)) continue
    const words = line.split(/\s+/).filter((w) => w.length >= 2)
    if (words.length < 2 || words.length > 5) continue
    if (!isLikelyPersonName(line)) continue
    const score = words.length * 10 + line.length
    if (score > bestScore) {
      bestScore = score
      best = cleanNameValue(line)
    }
  }
  return best
}

/** Après « Nom / Surname », prendre un mot majuscules type NDIAYE (ignorer Sex, dates, bruit). */
function findLastNameAfterLabel(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => normalizeSpaces(l)).filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    if (!LAST_NAME_LABEL.test(lines[i]) && !LAST_NAME_FUZZY.test(lines[i])) continue
    for (let j = 1; j <= 6; j++) {
      const next = lines[i + j]
      if (!next) break
      if (FIRST_NAME_LABEL.test(next) || PLACE_BIRTH_LABEL.test(next)) break
      if (TRANSLATION_ONLY.test(next)) continue
      if (/^(?:sexe|sex|taille|height|m|f)\b/i.test(next)) continue
      if (DATE_LABEL.test(next) || /^\d{1,2}[-/.]\d{1,2}/.test(next)) continue
      if (NAME_LINE.test(next) && isLikelyLastName(next)) {
        return cleanNameValue(next)
      }
      // Fragment OCR (Fs) : ignorer et continuer
    }
  }
  return null
}

function findMrzLines(text: string): string[] {
  const candidates = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .toUpperCase()
        .replace(/[^A-Z0-9<]/g, '')
        .replace(/ /g, '')
    )
    .filter((line) => line.length >= 28 && /</.test(line) && /^[A-Z0-9<]+$/.test(line))

  // TD3 passport : 2 × 44
  const td3 = candidates.filter((l) => l.length === 44)
  if (td3.length >= 2) return td3.slice(0, 2)

  // TD1 ID : 3 × 30
  const td1 = candidates.filter((l) => l.length === 30)
  if (td1.length >= 3) return td1.slice(0, 3)

  // TD2 : 2 × 36
  const td2 = candidates.filter((l) => l.length === 36)
  if (td2.length >= 2) return td2.slice(0, 2)

  // Approximations OCR (longueur proche)
  const near44 = candidates.filter((l) => l.length >= 40 && l.length <= 46)
  if (near44.length >= 2) {
    return near44.slice(0, 2).map((l) => l.padEnd(44, '<').slice(0, 44))
  }
  const near30 = candidates.filter((l) => l.length >= 28 && l.length <= 32)
  if (near30.length >= 3) {
    return near30.slice(0, 3).map((l) => l.padEnd(30, '<').slice(0, 30))
  }

  return []
}

function detectDocumentType(text: string, mrzCode: string | null): IdentityDocumentType {
  const upper = text.toUpperCase()
  if (mrzCode?.startsWith('P')) return 'passport'
  if (mrzCode?.startsWith('I') || mrzCode?.startsWith('ID') || mrzCode?.startsWith('C')) return 'cni'
  if (
    /PERMIS\s+DE\s+CONDUIRE|DRIVING\s+LICEN[CS]E|DRIVER'?S?\s+LICEN[CS]E/.test(upper) ||
    /\bCAT(?:EGORIE)?\s*[A-Z0-9]/.test(upper)
  ) {
    return 'driving_license'
  }
  if (/PASSEPORT|PASSPORT/.test(upper)) return 'passport'
  if (
    isSenegalCedeaoCard(text) ||
    /CARTE\s+NATIONALE|CNI|IDENTITY\s+CARD|CARTE\s+D.?IDENTIT|CEDEAO/.test(upper)
  ) {
    return 'cni'
  }
  return 'unknown'
}

/** Nom complet = Prénoms + Nom (ordre civil sénégalais / FR) */
function guessFullNameFromText(text: string): string | null {
  const { firstNames, lastName } = extractCedeaoFullNameParts(text)
  const composed = composeFullName(firstNames, lastName)
  if (composed) return composed

  const caps = findBestUppercaseNameLine(text)
  if (caps) return sanitizeFullName(titleCaseName(caps))
  return null
}

/** Retire un suffixe OCR parasite (ex. « Fs » issu de Sex). */
function sanitizeFullName(name: string): string {
  let parts = normalizeSpaces(name).split(/\s+/)
  while (parts.length > 1) {
    const last = parts[parts.length - 1]
    const letters = (last.match(/\p{L}/gu) || []).length
    if (letters <= 2 || /^(?:sex|sexe|fs|m|f)$/i.test(last)) {
      parts = parts.slice(0, -1)
      continue
    }
    break
  }
  return parts.join(' ')
}

function isExpired(isoDate: string | null): boolean {
  if (!isoDate) return false
  return isoDate < new Date().toISOString().slice(0, 10)
}

function mergeFields(
  target: IdentityScanFields,
  targetConfidence: IdentityScanResult['fieldConfidence'],
  source: Partial<IdentityScanFields>,
  sourceConfidence: Partial<Record<keyof IdentityScanFields, number>>,
  overwrite = false
) {
  for (const key of Object.keys(source) as (keyof IdentityScanFields)[]) {
    const value = source[key]
    if (value == null || value === '') continue
    if (!overwrite && target[key]) continue
    const incoming = sourceConfidence[key] ?? 0.5
    const current = targetConfidence[key] ?? 0
    if (!target[key] || incoming >= current) {
      ;(target as Record<string, string | null>)[key] = value
      targetConfidence[key] = incoming
    }
  }
}

export default class IdentityScanService {
  async #getWorker() {
    if (!workerPromise) {
      workerPromise = (async () => {
        const worker = await createWorker('fra+eng')
        await worker.setParameters({
          // Bloc de texte uniforme — mieux pour une CNI cadrée
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          preserve_interword_spaces: '1',
        })
        return worker
      })()
    }
    return workerPromise
  }

  validateScanFile(file: MultipartFile | null) {
    if (!file) {
      throw new Exception('Ajoutez une photo de la pièce d’identité.', {
        status: 422,
        code: 'E_SCAN_FILE_REQUIRED',
      })
    }

    if (typeof file.size === 'number' && file.size > MAX_SCAN_BYTES) {
      throw new Exception(
        `Photo trop lourde (max ${MAX_SCAN_LABEL}). Compressez-la ou reprenez la photo.`,
        { status: 422, code: 'E_SCAN_FILE_TOO_LARGE' }
      )
    }

    file.sizeLimit = MAX_SCAN_BYTES
    file.allowedExtensions = ALLOWED_EXTENSIONS
    file.validate()

    if (!file.isValid) {
      if (isSizeError(file) || (typeof file.size === 'number' && file.size > MAX_SCAN_BYTES)) {
        throw new Exception(
          `Photo trop lourde (max ${MAX_SCAN_LABEL}). Compressez-la ou reprenez la photo.`,
          { status: 422, code: 'E_SCAN_FILE_TOO_LARGE' }
        )
      }
      const detail = file.errors.map((e) => e.message).join(' ')
      throw new Exception(detail || 'Fichier image invalide (JPG, PNG ou WEBP).', {
        status: 422,
        code: 'E_INVALID_SCAN_FILE',
      })
    }

    const ext = (file.extname || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Exception('Format non autorisé (JPG, PNG ou WEBP).', {
        status: 422,
        code: 'E_SCAN_FILE_TYPE',
      })
    }

    return file
  }

  async scanFile(file: MultipartFile): Promise<IdentityScanResult> {
    const tmpPath = file.tmpPath
    if (!tmpPath) {
      throw new Exception('Impossible de lire le fichier uploadé.', {
        status: 500,
        code: 'E_SCAN_TMP_MISSING',
      })
    }

    const buffer = await readFile(tmpPath)
    return this.scanBuffer(buffer)
  }

  async scanBuffer(buffer: Buffer): Promise<IdentityScanResult> {
    let text = ''
    let ocrConfidence = 0

    try {
      const worker = await this.#getWorker()
      const primary = await worker.recognize(buffer)
      text = primary.data.text || ''
      ocrConfidence =
        typeof primary.data.confidence === 'number' ? primary.data.confidence / 100 : 0.5

      // 2e passe (PSM 4) si le nom n’apparaît pas clairement
      const quick = this.parseOcrText(text, ocrConfidence)
      if (!quick.fields.fullName) {
        try {
          await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN })
          const secondary = await worker.recognize(buffer)
          const alt = secondary.data.text || ''
          if (alt.length > text.length * 0.5) {
            text = `${text}\n${alt}`
            const c2 =
              typeof secondary.data.confidence === 'number'
                ? secondary.data.confidence / 100
                : ocrConfidence
            ocrConfidence = Math.max(ocrConfidence, c2)
          }
        } finally {
          await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
        }
      }
    } catch {
      return {
        documentType: 'unknown',
        confidence: 0,
        fields: emptyFields(),
        fieldConfidence: {},
        warnings: ['unreadable'],
        rawTextPreview: '',
        usedMrz: false,
      }
    }

    return this.parseOcrText(text, ocrConfidence)
  }

  /** Parse le texte OCR (exposé pour tests / CNI CEDEAO). */
  parseOcrText(text: string, ocrConfidence = 0.7): IdentityScanResult {
    const fields = emptyFields()
    const fieldConfidence: IdentityScanResult['fieldConfidence'] = {}
    const warnings: IdentityScanWarning[] = []
    let usedMrz = false
    let mrzDocCode: string | null = null

    const mrzLines = findMrzLines(text)
    if (mrzLines.length >= 2) {
      try {
        const parsed = parseMrz(mrzLines, { autocorrect: true })
        usedMrz = true
        const f = parsed.fields
        mrzDocCode = f.documentCode ?? null

        // Nom complet = prénom(s) + nom
        const fullName = composeFullName(f.firstName?.trim() || null, f.lastName?.trim() || null)
        if (fullName) {
          fields.fullName = fullName
          fieldConfidence.fullName = 0.95
        }
        const birth = mrzDateToIso(f.birthDate)
        if (birth) {
          fields.birthDate = birth
          fieldConfidence.birthDate = 0.95
        }
        const exp = mrzDateToIso(f.expirationDate)
        if (exp) {
          fields.documentExpiresAt = exp
          fieldConfidence.documentExpiresAt = 0.95
        }
        if (f.documentNumber) {
          fields.idCardNumber = f.documentNumber
          fieldConfidence.idCardNumber = 0.95
        }
        if (f.nationality) {
          fields.nationality = f.nationality
          fieldConfidence.nationality = 0.85
        }
      } catch {
        // OCR MRZ approximative : on continue avec les heuristiques
      }
    }

    let documentType = detectDocumentType(text, mrzDocCode)

    // CNI CEDEAO Sénégal : parseur dédié (Prénoms + Nom → fullName)
    if (isSenegalCedeaoCard(text) || documentType === 'cni') {
      documentType = documentType === 'unknown' ? 'cni' : documentType
      const senegal = parseSenegalCedeaoFields(text)
      mergeFields(fields, fieldConfidence, senegal.fields, senegal.confidence, !usedMrz)
    }

    if (!fields.fullName) {
      const name = guessFullNameFromText(text)
      if (name) {
        fields.fullName = name
        fieldConfidence.fullName = 0.55
      }
    }

    if (!fields.birthDate) {
      const birth = extractDateNearLabel(text, DATE_LABEL)
      if (birth) {
        fields.birthDate = birth
        fieldConfidence.birthDate = 0.6
      }
    }

    // Expiration : non préremplie (délivrance souvent confondue avec expiration)
    // Ville : saisie manuelle

    if (!fields.idCardNumber && documentType !== 'driving_license') {
      const senegalNo = extractSenegalCardNumber(text)
      if (senegalNo) {
        fields.idCardNumber = senegalNo
        fieldConfidence.idCardNumber = 0.7
      } else {
        const docNo = extractValueNearLabel(text, DOC_NUMBER_LABEL)
        if (docNo) {
          fields.idCardNumber = docNo.replace(/\s+/g, ' ').trim().toUpperCase()
          fieldConfidence.idCardNumber = 0.55
        }
      }
    }

    if (documentType === 'driving_license' || LICENSE_NUMBER_LABEL.test(text)) {
      const lic = extractValueNearLabel(text, LICENSE_NUMBER_LABEL)
      if (lic) {
        fields.licenseNumber = lic.replace(/\s+/g, '').toUpperCase()
        fieldConfidence.licenseNumber = 0.6
      } else if (documentType === 'driving_license' && fields.idCardNumber && !fields.licenseNumber) {
        fields.licenseNumber = fields.idCardNumber
        fieldConfidence.licenseNumber = 0.5
      }
    }

    if (!fields.placeOfBirth) {
      const place = extractValueNearLabel(text, PLACE_BIRTH_LABEL)
      if (place && isLikelyPersonName(place) && (place.match(/\p{L}/gu) || []).length >= 3) {
        fields.placeOfBirth = place
        fieldConfidence.placeOfBirth = 0.5
        // ville : saisie manuelle
      }
    }

    if (!fields.nationality) {
      const nat = extractValueNearLabel(text, NATIONALITY_LABEL)
      if (nat) {
        fields.nationality = nat
        fieldConfidence.nationality = 0.5
      }
    }

    const cat = text.match(CATEGORY_LABEL)
    if (cat?.[1]) {
      fields.licenseCategories = normalizeSpaces(cat[1]).toUpperCase()
      fieldConfidence.licenseCategories = 0.5
    }

    // Ne pas reporter documentExpiresAt → licenseExpiresAt (saisie manuelle)

    const filledCount = Object.values(fields).filter(Boolean).length
    if (ocrConfidence < 0.35 || (text.trim().length < 20 && !usedMrz)) {
      warnings.push('unreadable')
    } else if (ocrConfidence < 0.55 && !usedMrz) {
      warnings.push('low_confidence')
    }

    if (filledCount < 2) {
      warnings.push('partial')
    }

    if (!fields.fullName) {
      warnings.push('missing_required')
    }

    const expCheck = fields.licenseExpiresAt || fields.documentExpiresAt
    if (isExpired(expCheck)) {
      warnings.push('expired')
    }

    if (fields.birthDate && fields.birthDate > new Date().toISOString().slice(0, 10)) {
      warnings.push('incoherent')
    }

    const confidenceScores = Object.values(fieldConfidence)
    const avgField =
      confidenceScores.length > 0
        ? confidenceScores.reduce((a, b) => a + (b || 0), 0) / confidenceScores.length
        : 0
    const confidence = Math.min(
      1,
      Math.max(0, usedMrz ? 0.55 + avgField * 0.4 : ocrConfidence * 0.5 + avgField * 0.5)
    )

    return {
      documentType,
      confidence: Math.round(confidence * 100) / 100,
      fields,
      fieldConfidence,
      warnings: [...new Set(warnings)],
      rawTextPreview: text.slice(0, 500),
      usedMrz,
    }
  }
}
