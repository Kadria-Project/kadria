import { SignJWT, jwtVerify } from 'jose'

export const DEMO_ACCESS_COOKIE = 'kadria-demo-access'

type DemoAccessSessionPayload = {
  type: 'demo-access-session'
  requestId: string
  tokenHash: string
  exp?: number
}

function getDemoAccessSecretValue() {
  const secret =
    process.env.DEMO_ACCESS_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('Missing DEMO_ACCESS_SECRET or AUTH_SECRET')
  }

  return secret
}

function getDemoAccessSecret() {
  return new TextEncoder().encode(getDemoAccessSecretValue())
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashDemoAccessToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return bytesToHex(new Uint8Array(digest))
}

export function generateDemoAccessToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

export async function createDemoAccessSessionToken(input: {
  requestId: string
  tokenHash: string
  expiresAt: Date
}) {
  return new SignJWT({
    type: 'demo-access-session',
    requestId: input.requestId,
    tokenHash: input.tokenHash,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(input.expiresAt.getTime() / 1000))
    .sign(getDemoAccessSecret())
}

export async function verifyDemoAccessSessionToken(token: string): Promise<DemoAccessSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getDemoAccessSecret())
    if (payload.type !== 'demo-access-session') {
      return null
    }

    return {
      type: 'demo-access-session',
      requestId: String(payload.requestId || ''),
      tokenHash: String(payload.tokenHash || ''),
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    }
  } catch {
    return null
  }
}

export function getDemoAccessBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://kadria-beta.vercel.app'
  )
}

export function buildDemoAccessVerifyUrl(token: string) {
  return `${getDemoAccessBaseUrl()}/api/demo-access/verify?token=${encodeURIComponent(token)}`
}
