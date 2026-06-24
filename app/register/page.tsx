'use client'

import { Suspense, useState, CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import { normalizePlan, getPlanLabel, type PlanKey } from '@/src/config/plans'

const TRADES = [
  'Plombier',
  'Électricien',
  'Chauffagiste',
  'Menuisier',
  'Peintre',
  'Maçon',
  'Carreleur',
  'Couvreur',
  'Serrurier',
  'Paysagiste',
  'Autre',
]

type RegisterInterval = 'monthly' | 'yearly'

function resolveSelectedPlan(rawPlan: string | null): 'essentiel' | 'performance' {
  const normalized = normalizePlan(rawPlan)
  return normalized === 'performance' ? 'performance' : 'essentiel'
}

function resolveSelectedInterval(rawInterval: string | null): RegisterInterval {
  return rawInterval === 'yearly' ? 'yearly' : 'monthly'
}

function RegisterPageContent() {
  const searchParams = useSearchParams()
  const selectedPlan = resolveSelectedPlan(searchParams.get('plan'))
  const selectedInterval = resolveSelectedInterval(searchParams.get('interval'))

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [checkoutFailed, setCheckoutFailed] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    trade: '',
  })

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.firstName || !form.lastName || !form.email || !form.company || !form.trade) {
      setError('Merci de remplir tous les champs obligatoires.')
      return
    }
    if (!form.email.includes('@')) {
      setError('Adresse email invalide.')
      return
    }

    setLoading(true)
    setError('')
    setCheckoutFailed(false)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan: selectedPlan, interval: selectedInterval }),
      })
      const data = await res.json()

      if (data.success) {
        try {
          const checkoutRes = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ plan: selectedPlan, interval: selectedInterval }),
          })
          const checkoutData = await checkoutRes.json().catch(() => null)

          if (checkoutRes.ok && checkoutData?.success && checkoutData?.url) {
            window.location.href = checkoutData.url
            return
          }

          setCheckoutFailed(true)
          setDone(true)
        } catch {
          setCheckoutFailed(true)
          setDone(true)
        }
      } else {
        setError(data.error || 'Une erreur est survenue. Veuillez réessayer.')
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    background: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '10px',
    padding: '12px 14px',
    color: 'white',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    color: '#a1a1aa',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  }

  const selectedPlanLabel = getPlanLabel(selectedPlan as PlanKey)

  if (done) {
    return (
      <main style={{
        minHeight: '100vh',
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '20px',
          padding: '40px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
          <h1 style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: 700,
            margin: '0 0 12px',
          }}>
            Compte créé !
          </h1>
          <p style={{
            color: '#a1a1aa',
            fontSize: '14px',
            lineHeight: 1.7,
            margin: '0 0 24px',
          }}>
            Un email vous a été envoyé à<br />
            <strong style={{ color: 'white' }}>{form.email}</strong><br />
            avec un lien pour accéder à votre espace.
          </p>
          {checkoutFailed && (
            <div style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '16px',
            }}>
              <p style={{ color: '#f87171', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                Votre compte a été créé, mais le démarrage de l&apos;essai Stripe a échoué.
                Vous pourrez réessayer depuis les paramètres.
              </p>
            </div>
          )}
          <div style={{
            background: '#27272a',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'left',
            marginBottom: '8px',
          }}>
            <p style={{
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              margin: '0 0 12px',
            }}>
              Prochaines étapes
            </p>
            <ul style={{
              color: '#a1a1aa',
              fontSize: '13px',
              lineHeight: 1.8,
              margin: 0,
              paddingLeft: '20px',
            }}>
              <li>Ouvrez l&apos;email reçu de Kadria</li>
              <li>Cliquez sur le lien pour accéder à votre espace</li>
              <li>Configurez votre assistant en quelques minutes</li>
            </ul>
          </div>
          <p style={{ color: '#52525b', fontSize: '12px', margin: '20px 0 0' }}>
            Vérifiez vos spams si vous ne recevez rien dans 2 minutes.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#09090b',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #27272a',
      }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <KadriaLogo size="sm" theme="dark" noLink />
        </a>
        <a href="/login" style={{ color: '#a1a1aa', fontSize: '14px', textDecoration: 'none' }}>
          Déjà un compte ? <span style={{ color: '#22c55e' }}>Se connecter</span>
        </a>
      </div>

      <div style={{
        maxWidth: '520px',
        margin: '0 auto',
        padding: '48px 20px',
      }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{
            display: 'inline-block',
            background: 'rgba(34,197,94,0.1)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '999px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            7 jours gratuits — carte requise
          </span>
          <h1 style={{
            color: 'white',
            fontSize: '32px',
            fontWeight: 800,
            margin: 0,
          }}>
            Créez votre espace <span style={{
              background: 'linear-gradient(90deg, #22c55e, #4ade80)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Kadria</span>
          </h1>
        </div>

        {/* Selected plan reminder */}
        <div style={{
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>
            Offre sélectionnée : {selectedPlanLabel}
          </p>
          <p style={{ color: '#a1a1aa', fontSize: '12px', margin: 0 }}>
            7 jours d&apos;essai gratuit — aucun débit avant la fin de l&apos;essai.
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '20px',
          padding: '32px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Prénom *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => update('firstName', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => update('lastName', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Entreprise *</label>
            <input
              type="text"
              value={form.company}
              onChange={e => update('company', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Métier *</label>
            <select
              value={form.trade}
              onChange={e => update('trade', e.target.value)}
              style={inputStyle}
            >
              <option value="">Sélectionnez votre métier</option>
              {TRADES.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 16px' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#52525b' : '#22c55e',
              border: 'none',
              color: loading ? 'white' : 'black',
              fontWeight: 700,
              borderRadius: '10px',
              padding: '14px',
              fontSize: '15px',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Création en cours...' : 'Créer mon espace gratuit →'}
          </button>
        </div>

        {/* Social proof */}
        <p style={{
          color: '#52525b',
          fontSize: '12px',
          textAlign: 'center',
          margin: '24px 0 0',
          lineHeight: 1.6,
        }}>
          Sans engagement · Carte requise — aucun débit avant la fin des 7 jours d&apos;essai · Annulation possible avant la fin de l&apos;essai
        </p>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100vh',
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#a1a1aa',
      }}>
        Chargement...
      </main>
    }>
      <RegisterPageContent />
    </Suspense>
  )
}
