import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import {
  getRequiredPlanForFeature,
  hasFeature,
  normalizePlan,
  type PlanFeatureKey,
  type PlanKey,
} from '@/src/lib/plans'
import { getPlanForArtisan } from '@/src/lib/usage/quotas'

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('Missing AUTH_SECRET or NEXTAUTH_SECRET')
  }

  return new TextEncoder().encode(secret)
}

export interface AuthPayload {
  id?: string
  email: string
  artisanId: string
  companyName: string
  primaryColor: string
  role?: string
  plan?: PlanKey
  statut?: string
  firstName?: string
  lastName?: string
  exp?: number
}

export async function createToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload, plan: normalizePlan(payload.plan) })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getAuthSecret())
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret())
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('kadria-auth')?.value
  if (!token) return null
  const session = await verifyToken(token)
  if (!session) return null

  let plan = normalizePlan(session.plan)
  if (session.artisanId) {
    const livePlan = await getPlanForArtisan(session.artisanId)
    if (livePlan.success && livePlan.data) {
      plan = normalizePlan(livePlan.data)
    }
  }

  return {
    ...session,
    plan,
  }
}

export async function requireAdminSession(): Promise<AuthPayload | null> {
  const session = await getSession()
  if (!session || session.role !== 'Admin') return null
  return session
}

export type FeatureAccessResult =
  | { ok: true; session: AuthPayload }
  | {
      ok: false
      status: 401 | 403
      body: {
        success: false
        error: string
        feature?: PlanFeatureKey
        currentPlan?: PlanKey
        requiredPlan?: PlanKey
      }
    }

export async function requireFeatureAccess(
  feature: PlanFeatureKey
): Promise<FeatureAccessResult> {
  const session = await getSession()

  if (!session) {
    return {
      ok: false,
      status: 401,
      body: { success: false, error: 'Non authentifié' },
    }
  }

  if (!hasFeature(session.plan, feature)) {
    return {
      ok: false,
      status: 403,
      body: {
        success: false,
        error: 'Plan insuffisant',
        feature,
        currentPlan: normalizePlan(session.plan),
        requiredPlan: getRequiredPlanForFeature(feature),
      },
    }
  }

  return {
    ok: true,
    session,
  }
}

export async function createMagicToken(email: string): Promise<string> {
  return new SignJWT({ email, type: 'magic' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(getAuthSecret())
}

export async function verifyMagicToken(
  token: string
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret())
    if (payload.type !== 'magic') return null
    return { email: payload.email as string }
  } catch {
    return null
  }
}
