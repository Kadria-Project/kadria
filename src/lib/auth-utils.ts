import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import {
  getRequiredPlanForFeature,
  hasFeature,
  normalizePlan,
  type PlanFeatureKey,
  type PlanKey,
} from '@/src/lib/plans'
import { getAccountStatusForArtisan, getPlanForArtisan } from '@/src/lib/usage/quotas'

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
  billingStatus?: string
  firstName?: string
  lastName?: string
  exp?: number
}

interface CheckoutIntentPayload {
  artisanId: string
  email: string
  plan?: PlanKey
  interval?: 'monthly' | 'yearly'
  type: 'pending-checkout'
}

interface PlatformAccessInput {
  role?: string | null
  statut?: string | null
  billingStatus?: string | null
}

const AUTHORIZED_BILLING_STATUSES = new Set(['active', 'trialing'])
const AUTHORIZED_STATUTS = new Set(['actif'])
const BLOCKED_STATUTS = new Set(['pending_payment', 'payment_abandoned', 'inactive', 'suspended', 'suspendu', 'resilie', 'résilié'])
const BLOCKED_BILLING_STATUSES = new Set(['pending_payment', 'payment_abandoned', 'incomplete', 'incomplete_expired', 'past_due', 'canceled', 'unpaid'])

function normalizeAccessValue(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }
  return new Resend(apiKey)
}

function getAuthBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://kadria-beta.vercel.app'
}

export function canAccessPlatformAccount(input: PlatformAccessInput): boolean {
  const role = normalizeAccessValue(input.role)
  const statut = normalizeAccessValue(input.statut)
  const billingStatus = normalizeAccessValue(input.billingStatus)

  if (role === 'admin') return true
  if (BLOCKED_STATUTS.has(statut) || BLOCKED_BILLING_STATUSES.has(billingStatus)) return false
  if (AUTHORIZED_BILLING_STATUSES.has(billingStatus)) return true
  if (AUTHORIZED_STATUTS.has(statut) && !billingStatus) return true
  return false
}

export function isPendingPaymentAccount(input: PlatformAccessInput): boolean {
  const statut = normalizeAccessValue(input.statut)
  const billingStatus = normalizeAccessValue(input.billingStatus)
  return statut === 'pending_payment' || billingStatus === 'pending_payment' || billingStatus === 'payment_abandoned'
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

  if (session.role !== 'Admin' && session.artisanId) {
    const access = await getAccountStatusForArtisan(session.artisanId)
    if (access.success && access.data) {
      if (!canAccessPlatformAccount({
        role: session.role,
        statut: access.data.status,
        billingStatus: access.data.billingStatus,
      })) {
        return null
      }
    } else if (!canAccessPlatformAccount({
      role: session.role,
      statut: session.statut,
    })) {
      return null
    }
  }

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

export async function createCheckoutIntentToken(
  payload: Omit<CheckoutIntentPayload, 'type'>
): Promise<string> {
  return new SignJWT({ ...payload, plan: normalizePlan(payload.plan), type: 'pending-checkout' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .sign(getAuthSecret())
}

export async function verifyCheckoutIntentToken(token: string): Promise<Omit<CheckoutIntentPayload, 'type'> | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret())
    if (payload.type !== 'pending-checkout') return null
    return {
      artisanId: String(payload.artisanId || ''),
      email: String(payload.email || ''),
      plan: normalizePlan(payload.plan as string | undefined),
      interval: payload.interval === 'yearly' ? 'yearly' : 'monthly',
    }
  } catch {
    return null
  }
}

export async function sendPlatformMagicLinkEmail(input: {
  email: string
  companyName?: string | null
  firstName?: string | null
}) {
  const resend = getResendClient()
  const magicToken = await createMagicToken(input.email)
  const magicUrl = `${getAuthBaseUrl()}/api/auth/verify?token=${magicToken}`
  const greeting = input.firstName ? `Bonjour ${input.firstName},` : 'Bonjour,'

  const { error } = await resend.emails.send({
    from: 'Kadria <contact@kadria.fr>',
    to: input.email,
    subject: 'Votre lien de connexion Kadria',
    text: renderBaseEmailText({
      preheader: 'Connectez-vous a votre espace securise. Ce lien expire dans 10 minutes.',
      brand: 'Kadria',
      title: 'Connexion a votre espace Kadria',
      intro: `${greeting}\n\nVous avez demande a vous connecter a votre espace Kadria. Cliquez sur le bouton ci-dessous pour ouvrir votre session.`,
      ctaLabel: 'Acceder a mon espace',
      ctaUrl: magicUrl,
      secondaryText: `Ce lien est valable 10 minutes et ne peut etre utilise qu'une seule fois.\n\nSi le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : ${magicUrl}\n\nSi vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email. Aucun acces ne sera accorde sans ce lien.`,
      footerNote: 'Kadria - Assistant commercial pour artisans',
      accentColor: '#22c55e',
    }),
    html: renderBaseEmail({
      preheader: 'Connectez-vous a votre espace securise. Ce lien expire dans 10 minutes.',
      brand: 'Kadria',
      title: 'Connexion a votre espace Kadria',
      intro: `${greeting}\n\nVous avez demande a vous connecter a votre espace Kadria. Cliquez sur le bouton ci-dessous pour ouvrir votre session.`,
      ctaLabel: 'Acceder a mon espace',
      ctaUrl: magicUrl,
      secondaryText: `Ce lien est valable 10 minutes et ne peut etre utilise qu'une seule fois.\n\nSi le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : ${magicUrl}\n\nSi vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email. Aucun acces ne sera accorde sans ce lien.`,
      footerNote: 'Kadria - Assistant commercial pour artisans',
      accentColor: '#22c55e',
    }),
  })

  if (error) {
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error))
  }
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
