import { createSign } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import sharp from 'sharp'

type ServiceAccount = {
  client_email: string
  private_key: string
  token_uri?: string
}

type DocumentAiPayload = {
  document?: {
    text?: string
    pages?: Array<{
      lines?: Array<{ layout?: { confidence?: number } }>
    }>
  }
}

let tokenCache: { value: string; expiresAt: number } | null = null

function isConfigured() {
  return Boolean(
    env.get('DOCUMENT_AI_PROJECT_ID') &&
      env.get('DOCUMENT_AI_LOCATION') &&
      env.get('DOCUMENT_AI_PROCESSOR_ID') &&
      env.get('DOCUMENT_AI_CREDENTIALS')
  )
}

/**
 * Envoie la photo cadrée à Document AI (OCR) et renvoie le texte.
 * Retourne null si le service n’est pas configuré.
 */
export async function recognizeWithDocumentAi(
  buffer: Buffer
): Promise<{ text: string; confidence: number } | null> {
  if (!isConfigured()) return null

  const projectId = env.get('DOCUMENT_AI_PROJECT_ID')!
  const location = env.get('DOCUMENT_AI_LOCATION')!
  const processorId = env.get('DOCUMENT_AI_PROCESSOR_ID')!
  const credentialsPath = app.makePath(env.get('DOCUMENT_AI_CREDENTIALS')!)

  const image = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer()

  const account = JSON.parse(await readFile(credentialsPath, 'utf8')) as ServiceAccount
  const accessToken = await fetchAccessToken(account)
  const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawDocument: {
        content: image.toString('base64'),
        mimeType: 'image/jpeg',
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Document AI ${response.status}: ${detail.slice(0, 300)}`)
  }

  const payload = (await response.json()) as DocumentAiPayload
  const text = payload.document?.text ?? ''
  return { text, confidence: averageConfidence(payload) }
}

async function fetchAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.expiresAt > now + 60) return tokenCache.value

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: account.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  )
  const unsigned = `${header}.${claim}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`

  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Jeton Google ${response.status}: ${detail.slice(0, 300)}`)
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Jeton Google absent')
  tokenCache = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600),
  }
  return json.access_token
}

function averageConfidence(payload: DocumentAiPayload) {
  const scores =
    payload.document?.pages?.flatMap((page) =>
      (page.lines ?? [])
        .map((line) => line.layout?.confidence)
        .filter((score): score is number => typeof score === 'number')
    ) ?? []
  if (scores.length === 0) return 0.75
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

function base64url(value: string) {
  return Buffer.from(value).toString('base64url')
}
