'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      setError('Adresse email invalide')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await signIn('resend', {
        email,
        redirect: false,
        callbackUrl: '/dashboard-v2',
      })
      if (result?.error) {
        setError('Email non autorisé. Contactez Kadria pour accéder à votre espace.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

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
        maxWidth: '420px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
            <span style={{ color: '#22c55e' }}>K</span>
            <span style={{ color: 'white' }}>adria</span>
          </div>
          <p style={{ color: '#71717a', fontSize: '14px', margin: 0 }}>
            Espace professionnel artisan
          </p>
        </div>

        {!sent ? (
          <div style={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '20px',
            padding: '32px',
          }}>
            <h1 style={{
              color: 'white',
              fontSize: '22px',
              fontWeight: 700,
              margin: '0 0 8px',
            }}>
              Connexion
            </h1>
            <p style={{
              color: '#71717a',
              fontSize: '14px',
              margin: '0 0 28px',
              lineHeight: 1.6,
            }}>
              Entrez votre adresse email. Vous recevrez
              un lien de connexion instantané.
            </p>

            <label style={{
              display: 'block',
              color: '#a1a1aa',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="votre@email.fr"
              style={{
                width: '100%',
                background: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '10px',
                padding: '12px 14px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                marginBottom: error ? '8px' : '20px',
                boxSizing: 'border-box',
              }}
            />

            {error && (
              <p style={{
                color: '#f87171',
                fontSize: '13px',
                margin: '0 0 16px',
              }}>
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
                padding: '13px',
                fontSize: '15px',
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Envoi en cours...' : 'Recevoir mon lien de connexion →'}
            </button>

            <p style={{
              color: '#52525b',
              fontSize: '12px',
              textAlign: 'center',
              margin: '20px 0 0',
              lineHeight: 1.6,
            }}>
              Vous n&apos;avez pas de compte ?{' '}
              <a href="mailto:contact@kadria.fr" style={{ color: '#22c55e' }}>
                Contactez-nous
              </a>
            </p>
          </div>
        ) : (
          <div style={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '20px',
            padding: '40px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📬</div>
            <h2 style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 700,
              margin: '0 0 12px',
            }}>
              Email envoyé !
            </h2>
            <p style={{
              color: '#a1a1aa',
              fontSize: '14px',
              lineHeight: 1.7,
              margin: '0 0 24px',
            }}>
              Un lien de connexion a été envoyé à<br />
              <strong style={{ color: 'white' }}>{email}</strong>
            </p>
            <p style={{ color: '#71717a', fontSize: '13px', margin: 0 }}>
              Le lien expire dans 10 minutes.<br />
              Vérifiez vos spams si vous ne le recevez pas.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              style={{
                marginTop: '24px',
                background: 'transparent',
                border: '1px solid #3f3f46',
                color: '#a1a1aa',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ← Utiliser un autre email
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
