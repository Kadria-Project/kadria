import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
)

export interface AuthPayload {
  id?: string
  email: string
  artisanId: string
  companyName: string
  primaryColor: string
  role?: string
  plan?: string
  statut?: string
  firstName?: string
  lastName?: string
  exp?: number
}

export async function createToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('kadria-auth')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAdminSession(): Promise<AuthPayload | null> {
  const session = await getSession()
  if (!session || session.role !== 'Admin') return null
  return session
}

export async function createMagicToken(email: string): Promise<string> {
  return new SignJWT({ email, type: 'magic' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(SECRET)
}

export async function verifyMagicToken(
  token: string
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (payload.type !== 'magic') return null
    return { email: payload.email as string }
  } catch {
    return null
  }
}
