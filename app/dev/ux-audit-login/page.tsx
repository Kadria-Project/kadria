import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { assertUxAuditRequestAllowed, getConfiguredAuditEmail } from '@/src/lib/dev/ux-audit-guard'

/**
 * Local-only entry page for the "real product UX audit" access mechanism.
 * See docs/LOCAL_REAL_PRODUCT_UX_AUDIT_ACCESS.md for the full architecture.
 *
 * This page never renders anything (not even a shell) unless every
 * independent security condition holds: non-production runtime, explicit
 * server-only opt-in flag, configured audit email, and a localhost Host
 * header. Any missing condition results in a plain 404 — identical to a
 * route that doesn't exist, so this cannot be probed from outside.
 */
export default async function UxAuditLoginPage() {
  const headerList = await headers()
  const hostHeader = headerList.get('host')

  const check = assertUxAuditRequestAllowed({ hostHeader })
  if (!check.enabled) {
    notFound()
  }

  const email = getConfiguredAuditEmail()
  if (!email) {
    notFound()
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '20px',
          padding: '32px',
        }}
      >
        <p
          style={{
            color: '#f59e0b',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}
        >
          Environnement local uniquement
        </p>
        <h1
          style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: 700,
            margin: '0 0 8px',
          }}
        >
          Mode audit local Kadria
        </h1>
        <p
          style={{
            color: '#a1a1aa',
            fontSize: '14px',
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}
        >
          Compte de test : <strong style={{ color: 'white' }}>{email}</strong>
        </p>
        <a
          href="/api/dev/ux-audit-login"
          style={{
            display: 'block',
            textAlign: 'center',
            width: '100%',
            background: '#22c55e',
            border: 'none',
            color: 'black',
            fontWeight: 700,
            borderRadius: '10px',
            padding: '13px',
            fontSize: '15px',
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          Accéder au produit réel →
        </a>
        <p
          style={{
            color: '#52525b',
            fontSize: '12px',
            margin: '20px 0 0',
            lineHeight: 1.6,
          }}
        >
          Ce mécanisme n&apos;est disponible qu&apos;en local, avec les variables
          d&apos;environnement dédiées activées, et uniquement pour le compte
          de test ci-dessus.
        </p>
      </div>
    </main>
  )
}
