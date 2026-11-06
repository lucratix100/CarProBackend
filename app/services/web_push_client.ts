import {
  createCipheriv,
  createHmac,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  randomBytes,
  sign,
} from 'node:crypto'

/**
 * Client Web Push minimal (VAPID + aes128gcm) sans dépendance npm externe.
 */

export type WebPushSubscription = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export type VapidDetails = {
  subject: string
  publicKey: string
  privateKey: string
}

export class WebPushError extends Error {
  statusCode: number
  body: string

  constructor(statusCode: number, body: string) {
    super(`Web Push failed with status ${statusCode}`)
    this.name = 'WebPushError'
    this.statusCode = statusCode
    this.body = body
  }
}

function b64url(input: Buffer | Uint8Array) {
  return Buffer.from(input).toString('base64url')
}

function fromB64url(input: string) {
  return Buffer.from(input, 'base64url')
}

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const prk = createHmac('sha256', salt.length ? salt : Buffer.alloc(32))
    .update(ikm)
    .digest()

  let previous = Buffer.alloc(0)
  const output: Buffer[] = []
  let generated = 0
  let counter = 1

  while (generated < length) {
    previous = createHmac('sha256', prk)
      .update(previous)
      .update(info)
      .update(Buffer.from([counter]))
      .digest()
    output.push(previous)
    generated += previous.length
    counter += 1
  }

  return Buffer.concat(output).subarray(0, length)
}

function privateKeyFromVapid(privateKeyB64: string) {
  return createPrivateKey({
    key: Buffer.concat([
      Buffer.from(
        '308141020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420',
        'hex'
      ),
      fromB64url(privateKeyB64),
    ]),
    format: 'der',
    type: 'pkcs8',
  })
}

function buildJwt(aud: string, subject: string, privateKeyB64: string) {
  const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60
  const payload = b64url(Buffer.from(JSON.stringify({ aud, exp, sub: subject })))
  const data = `${header}.${payload}`
  const signature = sign('sha256', Buffer.from(data), {
    key: privateKeyFromVapid(privateKeyB64),
    dsaEncoding: 'ieee-p1363',
  })
  return `${data}.${b64url(signature)}`
}

function encryptPayload(
  userPublicKeyB64: string,
  userAuthB64: string,
  payload: Buffer
): Buffer {
  const userPublicKey = fromB64url(userPublicKeyB64)
  const userAuth = fromB64url(userAuthB64)

  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  })

  const asPublicDer = publicKey.export({ type: 'spki', format: 'der' }) as Buffer
  const asPublicKey = asPublicDer.subarray(asPublicDer.length - 65)

  const sharedSecret = diffieHellman({
    privateKey,
    publicKey: createPublicKey({
      key: Buffer.concat([
        Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex'),
        userPublicKey,
      ]),
      format: 'der',
      type: 'spki',
    }),
  })

  const salt = randomBytes(16)
  const authInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'ascii'),
    userPublicKey,
    asPublicKey,
  ])
  const ikm = hkdf(userAuth, sharedSecret, authInfo, 32)
  const contentEncryptionKey = hkdf(
    salt,
    ikm,
    Buffer.from('Content-Encoding: aes128gcm\0', 'ascii'),
    16
  )
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0', 'ascii'), 12)

  const padded = Buffer.concat([payload, Buffer.from([2])])
  const cipher = createCipheriv('aes-128-gcm', contentEncryptionKey, nonce)
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()])

  const rs = Buffer.alloc(4)
  rs.writeUInt32BE(4096)

  return Buffer.concat([salt, rs, Buffer.from([asPublicKey.length]), asPublicKey, encrypted])
}

export function generateVapidKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  })
  const pubDer = publicKey.export({ type: 'spki', format: 'der' }) as Buffer
  const publicKeyB64 = b64url(pubDer.subarray(pubDer.length - 65))
  const jwk = privateKey.export({ format: 'jwk' }) as { d?: string }
  if (!jwk.d) throw new Error('Impossible de générer la clé VAPID privée')
  return {
    publicKey: publicKeyB64,
    privateKey: jwk.d,
  }
}

export async function sendWebPushNotification(
  subscription: WebPushSubscription,
  payload: string | Buffer,
  vapid: VapidDetails,
  options?: { ttl?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high' }
) {
  const endpoint = new URL(subscription.endpoint)
  const audience = `${endpoint.protocol}//${endpoint.host}`
  const jwt = buildJwt(audience, vapid.subject, vapid.privateKey)
  const body = encryptPayload(
    subscription.keys.p256dh,
    subscription.keys.auth,
    Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8')
  )

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      'Crypto-Key': `p256ecdsa=${vapid.publicKey}`,
      TTL: String(options?.ttl ?? 60 * 60 * 24),
      Urgency: options?.urgency ?? 'normal',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(body.length),
    },
    body,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new WebPushError(response.status, text)
  }
}
