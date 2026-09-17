import { createWorker, type Worker } from 'tesseract.js'
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
  /(?:date\s*(?:d['’])?exp(?:iration)?|expire|valid(?:ité| until| thru)|valable\s*jusqu)/i
const DOC_NUMBER_LABEL =
  /(?:n[°o.]?\s*(?:cni|cin|pièce|document|passport|passeport|id)|document\s*no|passport\s*no|num(?:éro)?\s*(?:de\s*)?(?:pièce|cni|cin))/i
const LICENSE_NUMBER_LABEL =
  /(?:n[°o.]?\s*(?:de\s*)?permis|license\s*no|permis\s*n|dl\s*no|driving\s*licen[cs]e)/i
const PLACE_BIRTH_LABEL = /(?:lieu\s*de\s*naissance|place\s*of\s*birth|né\(e\)\s*à)/i
const NATIONALITY_LABEL = /(?:nationalité|nationality|citoyenneté)/i
const CATEGORY_LABEL = /(?:cat(?:égorie|egory)?(?:s)?|categories?)\s*[:.]?\s*([A-Z0-9\s,/+-]{1,20})/i

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
    const next = lines[i + 1]
    if (next) {
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
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!label.test(line)) continue
    const after = line.replace(label, '').replace(/^[\s:.\-–—]+/, '').trim()
    if (after.length >= 3 && !/^\d{1,2}[-/.]/.test(after)) return normalizeSpaces(after)
    const next = lines[i + 1]?.trim()
    if (next && next.length >= 3) return normalizeSpaces(next)
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
  if (/CARTE\s+NATIONALE|CNI|IDENTITY\s+CARD|CARTE\s+D.?IDENTIT/.test(upper)) return 'cni'
  return 'unknown'
}

function guessFullNameFromText(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => normalizeSpaces(l))
    .filter((l) => l.length >= 4 && l.length <= 60)

  const nom = lines.find((l) => /^(?:nom|surname|name)\b/i.test(l))
  const prenom = lines.find((l) => /^(?:pr[ée]noms?|given\s*names?|first\s*name)\b/i.test(l))
  if (nom || prenom) {
    const last = nom?.replace(/^(?:nom|surname|name)\s*[:.]?\s*/i, '').trim() ?? ''
    const first = prenom?.replace(/^(?:pr[ée]noms?|given\s*names?|first\s*name)\s*[:.]?\s*/i, '').trim() ?? ''
    const combined = normalizeSpaces(`${first} ${last}`.trim())
    if (combined.length >= 3) return titleCaseName(combined)
  }

  // Ligne en majuscules type NOM PRENOM (hors labels)
  for (const line of lines) {
    if (/^(NOM|PRENOM|DATE|N°|NO |NATIONAL|SEXE|NE |NÉ)/i.test(line)) continue
    if (/^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ'\-\s]{6,}$/.test(line) && /[A-Z]{2,}\s+[A-Z]{2,}/.test(line)) {
      return titleCaseName(line)
    }
  }
  return null
}

function isExpired(isoDate: string | null): boolean {
  if (!isoDate) return false
  return isoDate < new Date().toISOString().slice(0, 10)
}

export default class IdentityScanService {
  async #getWorker() {
    if (!workerPromise) {
      workerPromise = (async () => {
        const worker = await createWorker('fra+eng')
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
      const { data } = await worker.recognize(buffer)
      text = data.text || ''
      ocrConfidence = typeof data.confidence === 'number' ? data.confidence / 100 : 0.5
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

        const last = f.lastName?.trim() || ''
        const first = f.firstName?.trim() || ''
        if (last || first) {
          fields.fullName = titleCaseName(`${first} ${last}`.trim())
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

    const documentType = detectDocumentType(text, mrzDocCode)

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

    const expiry = extractDateNearLabel(text, EXPIRY_LABEL)
    if (expiry) {
      if (documentType === 'driving_license') {
        fields.licenseExpiresAt = expiry
        fieldConfidence.licenseExpiresAt = usedMrz ? 0.7 : 0.6
      } else if (!fields.documentExpiresAt) {
        fields.documentExpiresAt = expiry
        fieldConfidence.documentExpiresAt = 0.6
      }
    }

    if (!fields.idCardNumber && documentType !== 'driving_license') {
      const docNo = extractValueNearLabel(text, DOC_NUMBER_LABEL)
      if (docNo) {
        fields.idCardNumber = docNo.replace(/\s+/g, '').toUpperCase()
        fieldConfidence.idCardNumber = 0.55
      }
    }

    if (documentType === 'driving_license' || LICENSE_NUMBER_LABEL.test(text)) {
      const lic = extractValueNearLabel(text, LICENSE_NUMBER_LABEL)
      if (lic) {
        fields.licenseNumber = lic.replace(/\s+/g, '').toUpperCase()
        fieldConfidence.licenseNumber = 0.6
      } else if (documentType === 'driving_license' && fields.idCardNumber && !fields.licenseNumber) {
        // Sur certains permis, le n° document MRZ = n° permis
        fields.licenseNumber = fields.idCardNumber
        fieldConfidence.licenseNumber = 0.5
      }
    }

    const place = extractValueNearLabel(text, PLACE_BIRTH_LABEL)
    if (place) {
      fields.placeOfBirth = place
      fieldConfidence.placeOfBirth = 0.5
      if (!fields.city) {
        fields.city = place.split(',')[0]?.trim() || place
        fieldConfidence.city = 0.4
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

    if (documentType === 'driving_license' && fields.documentExpiresAt && !fields.licenseExpiresAt) {
      fields.licenseExpiresAt = fields.documentExpiresAt
      fieldConfidence.licenseExpiresAt = fieldConfidence.documentExpiresAt
    }

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
    const confidence = Math.min(1, Math.max(0, usedMrz ? 0.55 + avgField * 0.4 : ocrConfidence * 0.5 + avgField * 0.5))

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
