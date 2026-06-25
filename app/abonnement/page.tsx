'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type UsageStatus = 'ok' | 'warning' | 'limit_reached' | 'exceeded'

interface MonthlyUsageSummary {
  periodMonth: string
  plan: string
  projects: { used: number; limit: number | null; unlimited: boolean; status: UsageStatus }
  vapi: { callsUsed: number; callsLimit: number | null; callsUnlimited: boolean; minutesUsed: number; minutesLimit: number | null; status: UsageStatus }
}

interface AccountStatusSummary {
  plan: string
  status: string | null
  billingStatus: string | null
  trialEndDate: string | null
  nextBilling: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasStripeCustomer: boolean
}

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  essai: 'Essai',
  trial: 'Essai',
  trialing: 'Essai gratuit en cours',
  actif: 'Actif',
  active: 'Actif',
  en_cours: 'Actif',
  suspendu: 'Suspendu',
  suspended: 'Suspendu',
  annule: 'Annulé',
  annulé: 'Annulé',
  cancelled: 'Annulé',
  canceled: 'Annulé',
}

// Tokens repris du thème clair existant (app/globals.css, bloc [data-theme="light"] .dashboard-shell)
const COLORS = {
  bg: '#e9e9ec',
  bgElevated: '#ffffff',
  border: '#d4d4d8',
  text1: '#18181b',
  text2: '#3f3f46',
  text3: '#71717a',
  accent: '#16a34a',
  accentDim: 'rgba(22,163,74,0.08)',
  accentBorder: 'rgba(22,163,74,0.3)',
  danger: '#dc2626',
}

const card: React.CSSProperties = {
  background: COLORS.bgElevated,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '20px',
  padding: '20px',
  marginBottom: '16px',
}

export default function AbonnementPage() {
  const router = useRouter()
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsageSummary | null>(null)
  const [accountStatus, setAccountStatus] = useState<AccountStatusSummary | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [usageError, setUsageError] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const openBillingPortal = async () => {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.success && data.url) {
        window.location.href = data.url
        return
      }
      setPortalError(data.error || 'Impossible d’ouvrir la gestion d’abonnement.')
    } catch {
      setPortalError('Impossible d’ouvrir la gestion d’abonnement.')
    } finally {
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/usage/monthly')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.success && data.usage) {
          setMonthlyUsage(data.usage)
          setAccountStatus(data.account || null)
        } else {
          setUsageError(true)
        }
      })
      .catch(() => {
        if (!cancelled) setUsageError(true)
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main style={{
      minHeight: '100vh',
      background: COLORS.bg,
      fontFamily: 'system-ui, sans-serif',
      color: COLORS.text1,
    }}>
      {/* Header */}
      <div style={{
        background: COLORS.bgElevated,
        borderBottom: `1px solid ${COLORS.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
      }}>
        <button
          onClick={() => router.push('/dashboard-v2')}
          style={{
            background: 'transparent',
            border: 'none',
            color: COLORS.text2,
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0,
          }}
        >
          ← Retour
        </button>
        <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
          Mon abonnement
        </h1>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px 16px 40px' }}>
        {usageLoading ? (
          <div style={card}>
            <p style={{ color: COLORS.text3, fontSize: '14px', margin: 0 }}>Chargement…</p>
          </div>
        ) : usageError || !monthlyUsage ? (
          <div style={card}>
            <p style={{ color: COLORS.text3, fontSize: '14px', margin: 0 }}>
              Informations d&apos;abonnement indisponibles pour le moment.
            </p>
          </div>
        ) : (
          <>
            {/* Plan + statut */}
            <div style={card}>
              <p style={{
                margin: '0 0 4px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: COLORS.accent,
              }}>
                Plan actuel
              </p>
              <p style={{ margin: '0 0 16px', fontSize: '26px', fontWeight: 800, textTransform: 'capitalize' }}>
                {accountStatus?.plan || monthlyUsage.plan}
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: COLORS.accentDim,
                border: `1px solid ${COLORS.accentBorder}`,
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 700,
                color: COLORS.accent,
              }}>
                {accountStatus?.status
                  ? (ACCOUNT_STATUS_LABELS[accountStatus.status.toLowerCase()] || accountStatus.status)
                  : 'Statut non disponible'}
              </div>

              {accountStatus?.trialEndDate && (
                <p style={{ margin: '14px 0 0', fontSize: '13px', color: COLORS.text2 }}>
                  Fin d&apos;essai : <strong>{accountStatus.trialEndDate}</strong>
                </p>
              )}

              {accountStatus?.nextBilling && (
                <p style={{ margin: '14px 0 0', fontSize: '13px', color: COLORS.text2 }}>
                  {accountStatus.cancelAtPeriodEnd ? 'Fin d’accès le' : 'Renouvellement le'} : <strong>{accountStatus.nextBilling}</strong>
                </p>
              )}

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${COLORS.border}` }}>
                {accountStatus?.hasStripeCustomer ? (
                  <>
                    <button
                      onClick={openBillingPortal}
                      disabled={portalLoading}
                      style={{
                        width: '100%',
                        background: COLORS.accent,
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 700,
                        borderRadius: '12px',
                        padding: '14px 20px',
                        fontSize: '15px',
                        cursor: portalLoading ? 'default' : 'pointer',
                        opacity: portalLoading ? 0.7 : 1,
                      }}
                    >
                      {portalLoading ? 'Redirection...' : 'Gérer mon abonnement'}
                    </button>
                    {portalError && (
                      <p style={{ margin: '8px 0 0', fontSize: '13px', color: COLORS.danger }}>{portalError}</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: COLORS.text3, fontSize: '13px' }}>
                    Aucun abonnement Stripe actif. Gestion Stripe bientôt disponible.
                  </p>
                )}
              </div>
            </div>

            {/* Quotas */}
            <div style={card}>
              <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: COLORS.accent }}>
                Utilisation du mois
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '13px', color: COLORS.text3 }}>Dossiers</span>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.projects.unlimited
                      ? `${monthlyUsage.projects.used} / Illimité`
                      : `${monthlyUsage.projects.used} / ${monthlyUsage.projects.limit ?? 0}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '13px', color: COLORS.text3 }}>Appels vocaux</span>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.vapi.callsUnlimited
                      ? `${monthlyUsage.vapi.callsUsed} / Illimité`
                      : monthlyUsage.vapi.callsLimit === 0
                        ? 'Non inclus'
                        : `${monthlyUsage.vapi.callsUsed} / ${monthlyUsage.vapi.callsLimit}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '13px', color: COLORS.text3 }}>Minutes vocales</span>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>
                    {monthlyUsage.vapi.minutesLimit === null
                      ? `${monthlyUsage.vapi.minutesUsed} min / Non limité`
                      : `${monthlyUsage.vapi.minutesUsed} / ${monthlyUsage.vapi.minutesLimit} min`}
                  </span>
                </div>
              </div>

              <p style={{ margin: '18px 0 0', fontSize: '12px', color: COLORS.text3, lineHeight: 1.5 }}>
                Ces compteurs se réinitialisent automatiquement chaque mois.
              </p>
            </div>
          </>
        )}

        {/* CTAs */}
        <div style={card}>
          <button
            onClick={() => router.push('/tarifs')}
            style={{
              width: '100%',
              background: COLORS.accent,
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '15px',
              cursor: 'pointer',
              marginBottom: '10px',
            }}
          >
            Changer d&apos;offre
          </button>
          <a
            href="mailto:contact@kadria.fr"
            style={{
              display: 'block',
              textAlign: 'center',
              width: '100%',
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text1,
              fontWeight: 700,
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '15px',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            Contacter Kadria
          </a>
        </div>
      </div>
    </main>
  )
}
