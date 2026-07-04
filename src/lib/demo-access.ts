import { SignJWT, jwtVerify } from 'jose'
import { Resend } from 'resend'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export const DEMO_ACCESS_COOKIE = 'kadria-demo-access'
export const DEMO_ACCESS_DEFAULT_EXPIRY_DAYS = 7

export type DemoAccessStatus = 'pending' | 'approved' | 'rejected' | 'revoked' | 'expired'

export type DemoAccessRequestRecord = {
  id: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  company_name: string | null
  email: string
  phone: string | null
  trade: string | null
  website: string | null
  monthly_requests_volume: string | null
  current_tool: string | null
  main_need: string | null
  objective: string | null
  message: string | null
  consent_contact: boolean
  status: DemoAccessStatus
  approved_at: string | null
  revoked_at: string | null
  expires_at: string | null
  access_token_hash: string | null
  access_sent_at: string | null
  last_access_at: string | null
  access_count: number
  approved_by: string | null
  internal_note: string | null
}

type DemoAccessQueryOptions = {
  status?: string
  search?: string
}

type ApproveDemoAccessInput = {
  requestId?: string
  email?: string
  approvedBy: string
  sendEmail?: boolean
}

type UpdateStatusInput = {
  requestId?: string
  email?: string
  internalNote?: string
}

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

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }

  return new Resend(apiKey)
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

export function getEffectiveDemoAccessStatus(record: Pick<DemoAccessRequestRecord, 'status' | 'expires_at' | 'revoked_at'>): DemoAccessStatus {
  if (record.revoked_at || record.status === 'revoked') {
    return 'revoked'
  }

  const expiresAt = parseDate(record.expires_at)
  if (record.status === 'approved' && expiresAt && expiresAt.getTime() <= Date.now()) {
    return 'expired'
  }

  return record.status
}

export async function listDemoAccessRequests(options: DemoAccessQueryOptions = {}) {
  let query = supabaseAdmin
    .from('demo_access_requests')
    .select('*')
    .order('created_at', { ascending: false })

  const search = normalizeText(options.search).toLowerCase()
  if (search) {
    query = query.or(`email.ilike.%${search}%,company_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  let rows = (data || []) as DemoAccessRequestRecord[]
  const statusFilter = normalizeText(options.status).toLowerCase()
  if (statusFilter && statusFilter !== 'all') {
    rows = rows.filter((row) => getEffectiveDemoAccessStatus(row) === statusFilter)
  }

  return rows.map((row) => ({
    ...row,
    effective_status: getEffectiveDemoAccessStatus(row),
  }))
}

export async function getDemoAccessRequestById(requestId: string) {
  const { data, error } = await supabaseAdmin
    .from('demo_access_requests')
    .select('*')
    .eq('id', requestId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as DemoAccessRequestRecord | null) || null
}

async function findDemoAccessRequest(input: { requestId?: string; email?: string }) {
  const requestId = normalizeText(input.requestId)
  const email = normalizeText(input.email).toLowerCase()

  if (!requestId && !email) {
    return null
  }

  let query = supabaseAdmin
    .from('demo_access_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (requestId) {
    query = query.eq('id', requestId)
  } else {
    query = query.eq('email', email)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    throw error
  }

  return (data as DemoAccessRequestRecord | null) || null
}

export async function approveDemoAccessRequest(input: ApproveDemoAccessInput) {
  const row = await findDemoAccessRequest({ requestId: input.requestId, email: input.email })
  if (!row) {
    throw new Error('REQUEST_NOT_FOUND')
  }

  const rawToken = generateDemoAccessToken()
  const tokenHash = await hashDemoAccessToken(rawToken)
  const expiresAt = new Date(Date.now() + DEMO_ACCESS_DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  const verifyUrl = buildDemoAccessVerifyUrl(rawToken)

  const { error: updateError } = await supabaseAdmin
    .from('demo_access_requests')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      revoked_at: null,
      expires_at: expiresAt.toISOString(),
      access_token_hash: tokenHash,
      access_sent_at: new Date().toISOString(),
      approved_by: input.approvedBy,
    })
    .eq('id', row.id)

  if (updateError) {
    throw updateError
  }

  let emailed = false
  if (input.sendEmail && row.email) {
    const resend = getResendClient()
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Kadria <contact@kadria.fr>',
          to: row.email,
          subject: 'Votre acces a la demo Kadria',
          text: renderBaseEmailText({
            preheader: 'Votre acces demo Kadria est pret',
            title: 'Votre acces demo est pret',
            intro: `Bonjour ${row.first_name || ''}, votre acces a la demonstration Kadria a ete active.`,
            body: 'Cliquez sur le bouton ci-dessous pour ouvrir la demo complete.',
            ctaLabel: 'Ouvrir la demo Kadria',
            ctaUrl: verifyUrl,
            secondaryText: `Ce lien expire le ${expiresAt.toLocaleDateString('fr-FR')} et peut etre revoque a tout moment.`,
            footerNote: 'Kadria aide les artisans a qualifier, suivre et securiser leurs demandes clients.',
          }),
          html: renderBaseEmail({
            preheader: 'Votre accès démo Kadria est prêt',
            title: 'Votre accès démo est prêt',
            intro: `Bonjour ${row.first_name || ''}, votre accès à la démonstration Kadria a été activé.`,
            body: 'Cliquez sur le bouton ci-dessous pour ouvrir la démo complète.',
            ctaLabel: 'Ouvrir la démo Kadria',
            ctaUrl: verifyUrl,
            secondaryText: `Ce lien expire le ${expiresAt.toLocaleDateString('fr-FR')} et peut être révoqué à tout moment.`,
            footerNote: 'Kadria aide les artisans à qualifier, suivre et sécuriser leurs demandes clients.',
          }),
        })
        emailed = true
      } catch (emailError) {
        console.error('[DEMO ACCESS] Email error:', emailError)
      }
    }
  }

  return {
    requestId: row.id,
    status: 'approved' as const,
    expiresAt: expiresAt.toISOString(),
    verifyUrl,
    tokenHash,
    emailed,
  }
}

export async function revokeDemoAccessRequest(input: UpdateStatusInput) {
  const row = await findDemoAccessRequest({ requestId: input.requestId, email: input.email })
  if (!row) {
    throw new Error('REQUEST_NOT_FOUND')
  }

  const { error } = await supabaseAdmin
    .from('demo_access_requests')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      internal_note: input.internalNote ?? undefined,
    })
    .eq('id', row.id)

  if (error) {
    throw error
  }

  return row.id
}

export async function rejectDemoAccessRequest(input: UpdateStatusInput) {
  const row = await findDemoAccessRequest({ requestId: input.requestId, email: input.email })
  if (!row) {
    throw new Error('REQUEST_NOT_FOUND')
  }

  const { error } = await supabaseAdmin
    .from('demo_access_requests')
    .update({
      status: 'rejected',
      internal_note: input.internalNote ?? undefined,
    })
    .eq('id', row.id)

  if (error) {
    throw error
  }

  return row.id
}

export async function updateDemoAccessInternalNote(input: UpdateStatusInput) {
  const row = await findDemoAccessRequest({ requestId: input.requestId, email: input.email })
  if (!row) {
    throw new Error('REQUEST_NOT_FOUND')
  }

  const { error } = await supabaseAdmin
    .from('demo_access_requests')
    .update({
      internal_note: input.internalNote ?? '',
    })
    .eq('id', row.id)

  if (error) {
    throw error
  }

  return row.id
}
