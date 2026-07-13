// Unit tests for the local UX audit access guard (src/lib/dev/ux-audit-guard.ts).
//
// Run with: npm run test:ux-audit-guard
// (node's built-in test runner, no new test framework dependency added —
// this repository has no Jest/Vitest/Playwright test config or `test`
// script prior to this change).
//
// A tiny resolution hook (./server-only-shim.loader.mjs) is registered so
// that the guard module's `import 'server-only'` resolves without requiring
// the `server-only` package to be installed as a dependency here — it is a
// build-time-only no-op in real usage (normally shimmed by Next.js's
// webpack config) and has no runtime behaviour, so this is safe for tests.
import { register } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'

register('./server-only-shim.loader.mjs', import.meta.url)

const guard = await import('../ux-audit-guard')
const {
  isUxAuditModeConfigured,
  getConfiguredAuditEmail,
  isLocalHostHeader,
  assertUxAuditRequestAllowed,
} = guard as typeof import('../ux-audit-guard')

const ENV_KEYS = ['NODE_ENV', 'KADRIA_LOCAL_REAL_AUDIT', 'KADRIA_AUDIT_USER_EMAIL'] as const

function withEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>, fn: () => void) {
  const original: Record<string, string | undefined> = {}
  for (const key of ENV_KEYS) original[key] = process.env[key]

  for (const key of ENV_KEYS) {
    const value = overrides[key]
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key)
    } else {
      Object.assign(process.env, { [key]: value })
    }
  }

  try {
    fn()
  } finally {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) {
        Reflect.deleteProperty(process.env, key)
      } else {
        Object.assign(process.env, { [key]: original[key] })
      }
    }
  }
}

const CONFIGURED_EMAIL = 'ux-audit@kadria.test'
const BASE_ENABLED_ENV = {
  NODE_ENV: 'development',
  KADRIA_LOCAL_REAL_AUDIT: 'true',
  KADRIA_AUDIT_USER_EMAIL: CONFIGURED_EMAIL,
}

// --- isUxAuditModeConfigured / mode disabled -------------------------------

test('disabled mode: KADRIA_LOCAL_REAL_AUDIT absent -> not configured', () => {
  withEnv({ NODE_ENV: 'development', KADRIA_LOCAL_REAL_AUDIT: undefined, KADRIA_AUDIT_USER_EMAIL: CONFIGURED_EMAIL }, () => {
    assert.equal(isUxAuditModeConfigured(), false)
  })
})

test('disabled mode: KADRIA_AUDIT_USER_EMAIL absent -> not configured', () => {
  withEnv({ NODE_ENV: 'development', KADRIA_LOCAL_REAL_AUDIT: 'true', KADRIA_AUDIT_USER_EMAIL: undefined }, () => {
    assert.equal(isUxAuditModeConfigured(), false)
  })
})

test('disabled mode: KADRIA_LOCAL_REAL_AUDIT not exactly "true" -> not configured', () => {
  withEnv({ NODE_ENV: 'development', KADRIA_LOCAL_REAL_AUDIT: 'TRUE', KADRIA_AUDIT_USER_EMAIL: CONFIGURED_EMAIL }, () => {
    assert.equal(isUxAuditModeConfigured(), false)
  })
})

// --- Production -------------------------------------------------------------

test('production: NODE_ENV=production + KADRIA_LOCAL_REAL_AUDIT=true -> refused', () => {
  withEnv({ ...BASE_ENABLED_ENV, NODE_ENV: 'production' }, () => {
    assert.equal(isUxAuditModeConfigured(), false)
    const result = assertUxAuditRequestAllowed({ hostHeader: 'localhost:3000', requestedEmail: CONFIGURED_EMAIL })
    assert.equal(result.enabled, false)
    assert.equal(result.reason, 'not_configured')
  })
})

test('production with faked localhost Host header -> still refused', () => {
  withEnv({ ...BASE_ENABLED_ENV, NODE_ENV: 'production' }, () => {
    const result = assertUxAuditRequestAllowed({ hostHeader: 'localhost', requestedEmail: CONFIGURED_EMAIL })
    assert.equal(result.enabled, false)
    assert.equal(result.reason, 'not_configured')
  })
})

// --- Preview / non-local host -------------------------------------------------

test('preview/non-local Host header -> access refused', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    const result = assertUxAuditRequestAllowed({ hostHeader: 'my-app.vercel.app', requestedEmail: CONFIGURED_EMAIL })
    assert.equal(result.enabled, false)
    assert.equal(result.reason, 'non_local_host')
  })
})

test('missing Host header -> access refused', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    const result = assertUxAuditRequestAllowed({ hostHeader: null, requestedEmail: CONFIGURED_EMAIL })
    assert.equal(result.enabled, false)
    assert.equal(result.reason, 'non_local_host')
  })
})

// --- Wrong email --------------------------------------------------------------

test('wrong requested email -> access refused', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    const result = assertUxAuditRequestAllowed({ hostHeader: 'localhost:3000', requestedEmail: 'attacker@example.com' })
    assert.equal(result.enabled, false)
    assert.equal(result.reason, 'email_mismatch')
  })
})

test('email comparison is case-insensitive and trims whitespace (still exact match, no bypass)', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    const result = assertUxAuditRequestAllowed({ hostHeader: 'localhost:3000', requestedEmail: '  UX-Audit@Kadria.TEST  ' })
    assert.equal(result.enabled, true)
  })
})

// --- Arbitrary client parameters never controllable ---------------------------

test('getConfiguredAuditEmail always returns the server-configured email, never a client value', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    assert.equal(getConfiguredAuditEmail(), CONFIGURED_EMAIL)
  })
})

test('assertUxAuditRequestAllowed exposes no role/tenant/redirect/claims fields to override', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    // The guard's input surface is limited to hostHeader + requestedEmail.
    // Passing extra/arbitrary fields must have no effect on the outcome.
    const request = {
      hostHeader: 'localhost:3000',
      requestedEmail: CONFIGURED_EMAIL,
      role: 'Admin',
      tenantId: 'some-other-tenant',
      redirectPath: 'https://evil.example.com',
    }
    const result = assertUxAuditRequestAllowed(request)
    assert.equal(result.enabled, true)
  })
})

// --- Proxy headers never trusted ----------------------------------------------

test('X-Forwarded-Host is never read: guard only receives the raw Host value passed in, and a non-local real Host must still be refused', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    // Simulates a request whose real Host is not local, even if an
    // X-Forwarded-Host or Forwarded header claiming "localhost" existed
    // upstream (the guard's contract is: only the value explicitly passed
    // as hostHeader is ever considered, and callers must pass the real Host
    // header, never a forwarded one).
    const result = assertUxAuditRequestAllowed({ hostHeader: 'attacker.example.com', requestedEmail: CONFIGURED_EMAIL })
    assert.equal(result.enabled, false)
    assert.equal(result.reason, 'non_local_host')
  })
})

test('isLocalHostHeader rejects forwarded-style values that are not themselves a bare local hostname', () => {
  // Defends against a caller accidentally passing a Forwarded/X-Forwarded-Host
  // style value (e.g. "host=localhost") instead of a real Host header.
  assert.equal(isLocalHostHeader('host=localhost'), false)
  assert.equal(isLocalHostHeader('for=1.2.3.4;host=localhost;proto=https'), false)
})

// --- Happy path (still gated correctly) ---------------------------------------

test('all conditions met -> access allowed', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    const result = assertUxAuditRequestAllowed({ hostHeader: 'localhost:3000', requestedEmail: CONFIGURED_EMAIL })
    assert.equal(result.enabled, true)
    assert.equal(result.reason, undefined)
  })
})

test('requestedEmail omitted entirely still allows (page-only check, no email in query yet)', () => {
  withEnv(BASE_ENABLED_ENV, () => {
    const result = assertUxAuditRequestAllowed({ hostHeader: 'localhost:3000' })
    assert.equal(result.enabled, true)
  })
})

// --- isLocalHostHeader: basic hosts -------------------------------------------

test('isLocalHostHeader: accepts localhost, 127.0.0.1, with and without port', () => {
  assert.equal(isLocalHostHeader('localhost'), true)
  assert.equal(isLocalHostHeader('localhost:3000'), true)
  assert.equal(isLocalHostHeader('127.0.0.1'), true)
  assert.equal(isLocalHostHeader('127.0.0.1:3000'), true)
  assert.equal(isLocalHostHeader('LOCALHOST:3000'), true)
})

test('isLocalHostHeader: rejects arbitrary/spoofed hosts', () => {
  assert.equal(isLocalHostHeader('evil.example.com'), false)
  assert.equal(isLocalHostHeader('my-app.vercel.app'), false)
  assert.equal(isLocalHostHeader('localhost.evil.com'), false)
  assert.equal(isLocalHostHeader(''), false)
  assert.equal(isLocalHostHeader(undefined), false)
})

// --- IPv6 parsing (F-2) ---------------------------------------------------------

test('isLocalHostHeader: bare IPv6 loopback "::1" (no brackets, no port) is accepted', () => {
  assert.equal(isLocalHostHeader('::1'), true)
})

test('isLocalHostHeader: bracketed IPv6 loopback "[::1]" without a port is accepted', () => {
  assert.equal(isLocalHostHeader('[::1]'), true)
})

test('isLocalHostHeader: bracketed IPv6 loopback with port "[::1]:3000" is accepted (regression test for F-2)', () => {
  assert.equal(isLocalHostHeader('[::1]:3000'), true)
})

test('isLocalHostHeader: bracketed non-loopback IPv6 with port is still rejected', () => {
  assert.equal(isLocalHostHeader('[2001:db8::1]:3000'), false)
})
