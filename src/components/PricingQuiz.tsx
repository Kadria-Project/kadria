'use client'

import { useState } from 'react'

export interface QuizResult {
  plan: 'starter' | 'pro' | 'agency'
  planLabel: string
  answers: Record<string, string>
  answersText: string
}

interface Props {
  onComplete?: (result: QuizResult) => void
  showCTA?: boolean
}

const QUESTIONS = [
  {
    id: 'website',
    question: 'Disposez-vous déjà d\'un site web professionnel ?',
    options: ['Oui', 'Non'],
  },
  {
    id: 'calls',
    question: 'Recevez-vous régulièrement des appels lorsque vous êtes sur chantier ?',
    options: ['Oui, souvent', 'Parfois', 'Rarement'],
  },
  {
    id: 'demand',
    question: 'Combien de demandes recevez-vous chaque mois ?',
    options: ['Moins de 10', 'Entre 10 et 30', 'Plus de 30'],
  },
  {
    id: 'team',
    question: 'Travaillez-vous :',
    options: ['Seul', 'Avec une petite équipe', 'Avec plusieurs équipes'],
  },
]

const RESULTS = {
  starter: {
    plan: 'starter' as const,
    planLabel: 'Essentiel',
    color: '#e4e4e7',
    bg: '#27272a',
    border: '#3f3f46',
    title: 'L\'Essentiel est fait pour vous',
    desc: 'Parfait pour démarrer et centraliser vos demandes web sans vous compliquer la vie.',
    price: '99€/mois',
  },
  pro: {
    plan: 'pro' as const,
    planLabel: 'Pro',
    color: '#4ade80',
    bg: 'rgba(20,83,45,0.5)',
    border: '#22c55e',
    title: 'Le plan Pro correspond à votre activité',
    desc: 'Vous perdez des appels et des demandes — Kadria Pro qualifie vos prospects 24h/24, web et téléphone.',
    price: '199€/mois',
  },
  agency: {
    plan: 'agency' as const,
    planLabel: 'Agence',
    color: '#c084fc',
    bg: 'rgba(88,28,135,0.3)',
    border: '#a855f7',
    title: 'La formule Agence est idéale',
    desc: 'Votre volume et structure nécessitent une solution multi-comptes avec accompagnement dédié.',
    price: 'Sur devis',
  },
}

function computePlan(answers: Record<string, string>): 'starter' | 'pro' | 'agency' {
  const bigTeam = answers.team === 'Avec plusieurs équipes'
  const manyDemands = answers.demand === 'Plus de 30'
  const hasManyCalls = answers.calls === 'Oui, souvent'
  const someCalls = answers.calls === 'Parfois'
  const hasWebsite = answers.website === 'Oui'

  if (bigTeam || (manyDemands && hasManyCalls)) return 'agency'
  if (hasManyCalls || manyDemands || (hasWebsite && someCalls)) return 'pro'
  return 'starter'
}

export default function PricingQuiz({ onComplete, showCTA = true }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<typeof RESULTS[keyof typeof RESULTS] | null>(null)

  const answer = (option: string) => {
    const q = QUESTIONS[step]
    const newAnswers = { ...answers, [q.id]: option }
    setAnswers(newAnswers)

    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1)
    } else {
      const plan = computePlan(newAnswers)
      const r = RESULTS[plan]
      setResult(r)
      if (onComplete) {
        const answersText = QUESTIONS.map(q =>
          `${q.question} → ${newAnswers[q.id]}`
        ).join('\n')
        onComplete({
          plan: r.plan,
          planLabel: r.planLabel,
          answers: newAnswers,
          answersText,
        })
      }
    }
  }

  const reset = () => {
    setStep(0)
    setAnswers({})
    setResult(null)
  }

  return (
    <div style={{
      background: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '20px',
      padding: '40px',
      maxWidth: '640px',
      margin: '0 auto',
      fontFamily: 'system-ui',
    }}>
      {!result ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <p style={{
              color: '#22c55e', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              margin: '0 0 8px',
            }}>
              Questionnaire
            </p>
            <h2 style={{
              color: 'white', fontSize: '22px',
              fontWeight: 800, margin: '0 0 8px',
            }}>
              Quelle offre est faite pour vous ?
            </h2>
            <p style={{ color: '#71717a', fontSize: '14px', margin: 0 }}>
              Répondez à quelques questions pour découvrir l&apos;offre la plus adaptée.
            </p>
          </div>

          {/* Barre de progression */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
            {QUESTIONS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: '4px', borderRadius: '2px',
                background: i <= step ? '#22c55e' : '#27272a',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* Question */}
          <div style={{
            background: '#27272a', borderRadius: '14px',
            padding: '20px', marginBottom: '14px',
          }}>
            <p style={{ color: '#71717a', fontSize: '12px', margin: '0 0 6px' }}>
              Question {step + 1} / {QUESTIONS.length}
            </p>
            <p style={{
              color: 'white', fontSize: '17px',
              fontWeight: 600, margin: 0, lineHeight: 1.5,
            }}>
              {QUESTIONS[step].question}
            </p>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {QUESTIONS[step].options.map(option => (
              <button
                key={option}
                onClick={() => answer(option)}
                style={{
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'system-ui',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'rgba(34,197,94,0.1)'
                  el.style.borderColor = '#22c55e'
                  el.style.color = '#22c55e'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = '#27272a'
                  el.style.borderColor = '#3f3f46'
                  el.style.color = 'white'
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Résultat */
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <div style={{
            display: 'inline-block',
            background: result.bg,
            border: `1px solid ${result.border}`,
            borderRadius: '20px', padding: '4px 16px',
            color: result.color,
            fontSize: '13px', fontWeight: 700,
            marginBottom: '16px',
          }}>
            {result.planLabel}
          </div>
          <h3 style={{
            color: 'white', fontSize: '22px',
            fontWeight: 800, margin: '0 0 12px',
          }}>
            {result.title}
          </h3>
          <p style={{
            color: '#a1a1aa', fontSize: '15px',
            lineHeight: 1.7, margin: '0 0 20px',
          }}>
            {result.desc}
          </p>
          <div style={{
            background: '#27272a', borderRadius: '14px',
            padding: '16px 24px', marginBottom: '24px',
            display: 'inline-block',
          }}>
            <p style={{ color: '#71717a', fontSize: '12px', margin: '0 0 4px' }}>
              À partir de
            </p>
            <p style={{
              color: result.color, fontSize: '28px',
              fontWeight: 800, margin: 0,
            }}>
              {result.price}
            </p>
          </div>
          {showCTA && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={reset} style={{
                background: 'transparent', border: '1px solid #3f3f46',
                color: '#a1a1aa', borderRadius: '10px',
                padding: '11px 20px', fontSize: '14px', cursor: 'pointer',
              }}>
                Recommencer
              </button>
              <a href="/demo-request" style={{
                background: '#22c55e', color: 'black', fontWeight: 700,
                borderRadius: '10px', padding: '11px 24px',
                fontSize: '14px', textDecoration: 'none',
                display: 'inline-block',
              }}>
                Réserver une démo →
              </a>
            </div>
          )}
          {!showCTA && (
            <button onClick={reset} style={{
              background: 'transparent', border: '1px solid #3f3f46',
              color: '#a1a1aa', borderRadius: '10px',
              padding: '11px 20px', fontSize: '14px', cursor: 'pointer',
            }}>
              Modifier mes réponses
            </button>
          )}
        </div>
      )}
    </div>
  )
}
