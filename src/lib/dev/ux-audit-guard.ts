import 'server-only'

/**
 * Fail-closed guard for the local "real product UX audit" access mechanism.
 *
 * This mechanism exists ONLY so a local Playwright agent can log into the
 * real, authenticated artisan space (/dashboard-v2 and below) against a
 * dedicated, explicitly-configured test account — never a real artisan
 * account, never in production, never on a deployed preview.
 *
 * All checks below are independent and ALL must pass. Any single missing or
 * misconfigured condition must keep the platform behaving exactly as if this
 * file did not exist: no extra route becomes reachable, no session is ever
 * created, no 500 either — silent inert behaviour (404 on the page, 404 on
 * the API route).
 *
 * IMPORTANT: no NEXT_PUBLIC_ variable is used here on purpose. Anything
 * prefixed NEXT_PUBLIC_ is bundled into client JS and can be read/guessed by
 * anyone; the activation flag and the audit email must stay server-only.
 */

export interface UxAuditModeCheck {
  enabled: boolean
  reason?: string
}

/**
 * Returns true only if the two purely-environmental conditions are met:
 * non-production runtime AND explicit opt-in flag. This does NOT check the
 * host — that must be validated per-request against the actual `Host`
 * header (see isLocalHost / assertUxAuditRequestAllowed below), because the
 * runtime environment alone cannot prove the request came from localhost.
 */
export function isUxAuditModeConfigured(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.KADRIA_LOCAL_REAL_AUDIT === 'true' &&
    typeof process.env.KADRIA_AUDIT_USER_EMAIL === 'string' &&
    process.env.KADRIA_AUDIT_USER_EMAIL.trim().length > 0
  )
}

export function getConfiguredAuditEmail(): string | null {
  const email = process.env.KADRIA_AUDIT_USER_EMAIL
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

/**
 * Validates that the incoming request's Host header is strictly localhost.
 * Deliberately strict (no wildcard, no subdomain matching, no trusting
 * X-Forwarded-Host) so this cannot be satisfied by a crafted header when the
 * app happens to run behind a proxy (e.g. Vercel Preview, which this must
 * never work on).
 */
export function isLocalHostHeader(hostHeader: string | null | undefined): boolean {
  if (!hostHeader) return false
  const host = hostHeader.trim().toLowerCase()

  // Bracketed IPv6 form, e.g. "[::1]" or "[::1]:3000". Extract everything
  // between the brackets as the hostname instead of naively splitting on
  // ":" (which would otherwise break on the colons inside the address
  // itself and yield "[" as the hostname — a false negative, fail-closed,
  // but a real usability bug for anyone running the audit server on an
  // IPv6-only loopback binding).
  if (host.startsWith('[')) {
    const closingBracketIndex = host.indexOf(']')
    if (closingBracketIndex === -1) return false
    const hostname = host.slice(1, closingBracketIndex)
    return hostname === '::1'
  }

  // Bare (unbracketed) IPv6 loopback, e.g. "::1" with no port — has no
  // ambiguity to resolve since there's no port suffix to strip.
  if (host === '::1') return true

  const hostname = host.split(':')[0]
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/**
 * Full server-side gate for the audit mechanism. Combines every independent
 * condition required by the security spec:
 *   1. non-production runtime
 *   2. explicit server-only opt-in flag
 *   3. explicit audit email configured
 *   4. request Host header is localhost/127.0.0.1
 *   5. (optional) requested email matches the configured audit email exactly
 *
 * Returns { enabled: false, reason } for every failure so callers can log
 * (without ever logging secrets) and return an inert 404-style response.
 */
export function assertUxAuditRequestAllowed(input: {
  hostHeader: string | null | undefined
  requestedEmail?: string | null
}): UxAuditModeCheck {
  if (!isUxAuditModeConfigured()) {
    return { enabled: false, reason: 'not_configured' }
  }

  if (!isLocalHostHeader(input.hostHeader)) {
    return { enabled: false, reason: 'non_local_host' }
  }

  if (typeof input.requestedEmail !== 'undefined') {
    const configuredEmail = getConfiguredAuditEmail()
    const requested = String(input.requestedEmail || '').trim().toLowerCase()
    if (!configuredEmail || requested !== configuredEmail) {
      return { enabled: false, reason: 'email_mismatch' }
    }
  }

  return { enabled: true }
}
