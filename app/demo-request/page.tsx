'use client'

import { useState } from 'react'
import PricingQuiz, { QuizResult } from '@/src/components/PricingQuiz'

const STEPS = [
  { id: 'quiz', label: 'Votre profil' },
  { id: 'contact', label: 'Vos informations' },
  { id: 'entreprise', label: 'Votre entreprise' },
  { id: 'planning', label: 'Planification' },
]

export default function DemoRequestPage() {
  const [step, setStep] = useState(0)
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    phone: '',
    societe: '',
    trade: '',
    teamSize: '',
    demand: '',
    website: '',
    preferredSlot: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quizResult,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: '#27272a',
    border: '1px solid #3f3f46',
    color: 'white',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '14px',
    fontFamily: 'system-ui',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    color: '#a1a1aa',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#09090b',
      fontFamily: 'system-ui, sans-serif',
      padding: '60px 20px',
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            color: 'white', fontSize: '28px',
            fontWeight: 800, margin: '0 0 8px',
          }}>
            Réserver une démo
          </h1>
          <p style={{ color: '#71717a', fontSize: '15px', margin: 0 }}>
            Quelques informations pour vous proposer la meilleure démonstration possible.
          </p>
        </div>

        {/* Étapes */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: i <= step ? '#22c55e' : '#27272a',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {quizResult && step > 0 && (
          <div style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid #22c55e',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#4ade80',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            Profil recommandé : {quizResult.planLabel}
          </div>
        )}

        {step === 0 && (
          <PricingQuiz
            showCTA={false}
            onComplete={(result) => {
              setQuizResult(result)
              setStep(1)
            }}
          />
        )}

        {step === 1 && (
          <div style={{
            background: '#18181b', border: '1px solid #27272a',
            borderRadius: '20px', padding: '32px',
          }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 800, margin: '0 0 20px' }}>
              Vos informations
            </h2>
            <p style={{
              color: '#71717a', fontSize: '12px', margin: '0 0 16px',
              textAlign: 'right',
            }}>
              <span style={{ color: '#f87171' }}>*</span> Champs obligatoires
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>
                  Prénom <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input style={inputStyle} value={form.prenom} onChange={e => update('prenom', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>
                  Nom <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input style={inputStyle} value={form.nom} onChange={e => update('nom', e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                Email <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input type="email" style={inputStyle} value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>
                Téléphone <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input type="tel" style={inputStyle} value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                if (!form.prenom.trim()) {
                  alert('Merci de renseigner votre prénom.')
                  return
                }
                if (!form.nom.trim()) {
                  alert('Merci de renseigner votre nom.')
                  return
                }
                if (!form.email.trim() || !form.email.includes('@')) {
                  alert('Merci de renseigner un email valide.')
                  return
                }
                if (!form.phone.trim()) {
                  alert('Merci de renseigner votre téléphone.')
                  return
                }
                setStep(s => s + 1)
              }} style={{
                background: '#22c55e', color: 'black', fontWeight: 700,
                borderRadius: '10px', padding: '12px 24px',
                fontSize: '14px', cursor: 'pointer', border: 'none',
              }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{
            background: '#18181b', border: '1px solid #27272a',
            borderRadius: '20px', padding: '32px',
          }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 800, margin: '0 0 20px' }}>
              Votre entreprise
            </h2>
            <p style={{
              color: '#71717a', fontSize: '12px', margin: '0 0 16px',
              textAlign: 'right',
            }}>
              <span style={{ color: '#f87171' }}>*</span> Champs obligatoires
            </p>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                Société <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input style={inputStyle} value={form.societe} onChange={e => update('societe', e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                Métier / activité <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input style={inputStyle} value={form.trade} onChange={e => update('trade', e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                Taille de l&apos;équipe <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input style={inputStyle} value={form.teamSize} onChange={e => update('teamSize', e.target.value)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                Demandes par mois <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input style={inputStyle} value={form.demand} onChange={e => update('demand', e.target.value)} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Site web (si existant)</label>
              <input style={inputStyle} value={form.website} onChange={e => update('website', e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={{
                background: 'transparent', border: '1px solid #3f3f46',
                color: '#a1a1aa', borderRadius: '10px',
                padding: '12px 24px', fontSize: '14px', cursor: 'pointer',
              }}>
                ← Retour
              </button>
              <button onClick={() => {
                if (!form.societe.trim()) {
                  alert('Merci de renseigner le nom de votre entreprise.')
                  return
                }
                if (!form.trade) {
                  alert('Merci de sélectionner votre métier.')
                  return
                }
                if (!form.teamSize) {
                  alert("Merci d'indiquer la taille de votre équipe.")
                  return
                }
                if (!form.demand) {
                  alert('Merci d\'indiquer votre volume de demandes.')
                  return
                }
                setStep(s => s + 1)
              }} style={{
                background: '#22c55e', color: 'black', fontWeight: 700,
                borderRadius: '10px', padding: '12px 24px',
                fontSize: '14px', cursor: 'pointer', border: 'none',
              }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {step === 3 && !submitted && (
          <div style={{
            background: '#18181b', border: '1px solid #27272a',
            borderRadius: '20px', padding: '32px',
          }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 800, margin: '0 0 20px' }}>
              Planification
            </h2>
            <p style={{
              color: '#71717a', fontSize: '12px', margin: '0 0 16px',
              textAlign: 'right',
            }}>
              <span style={{ color: '#f87171' }}>*</span> Champs obligatoires
            </p>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Créneau préféré pour la démo</label>
              <input
                style={inputStyle}
                placeholder="Ex : Mardi après-midi, semaine du 16 juin..."
                value={form.preferredSlot}
                onChange={e => update('preferredSlot', e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Message (optionnel)</label>
              <textarea
                style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' as const }}
                value={form.message}
                onChange={e => update('message', e.target.value)}
              />
            </div>
            {error && (
              <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '14px' }}>{error}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{
                background: 'transparent', border: '1px solid #3f3f46',
                color: '#a1a1aa', borderRadius: '10px',
                padding: '12px 24px', fontSize: '14px', cursor: 'pointer',
              }}>
                ← Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  background: submitting ? '#27272a' : '#22c55e',
                  color: submitting ? '#71717a' : 'black',
                  fontWeight: 700,
                  borderRadius: '10px', padding: '12px 24px',
                  fontSize: '14px', cursor: submitting ? 'default' : 'pointer',
                  border: 'none',
                }}
              >
                {submitting ? 'Envoi...' : 'Réserver ma présentation'}
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div style={{
            background: '#18181b', border: '1px solid #27272a',
            borderRadius: '20px', padding: '40px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>
              Demande envoyée !
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>
              Merci, nous avons bien reçu votre demande. Notre équipe vous contactera très rapidement pour planifier votre démonstration.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
