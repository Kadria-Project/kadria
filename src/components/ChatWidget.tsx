'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant'; content: string }
interface Dossier {
  clientFirstName?: string; clientName?: string
  clientPhone?: string; clientEmail?: string
  siteAddress?: string; city?: string; postalCode?: string
  trade?: string; projectType?: string; budget?: string
  desiredTimeline?: string; maturity?: string; aiSummary?: string
}
interface Props {
  artisanId?: string
  artisanName?: string
  primaryColor?: string
  inline?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseReply(raw: string): { text: string; options: string[] } {
  const match = raw.match(/<>([\s\S]*?)<>/)
  if (!match) return { text: raw.trim(), options: [] }
  const options = match[1].split('|').map(o => o.trim()).filter(Boolean)
  const text = raw.replace(/<>[\s\S]*?<>/, '').trim()
  return { text, options }
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\n\n/g, '</p><p style="margin-top:10px">')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

// ─── Address autocomplete ─────────────────────────────────────────────────────
interface AdresseSuggestion { label: string; city: string; postcode: string }

async function fetchAdresses(q: string): Promise<AdresseSuggestion[]> {
  if (q.length < 3) return []
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
  )
  const data = await res.json()
  return (data.features || []).map((f: any) => ({
    label: f.properties.label,
    city: f.properties.city,
    postcode: f.properties.postcode,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatWidget({
  artisanId = 'Artisan_demo',
  artisanName = "l'artisan",
  primaryColor = '#22c55e',
  inline = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(inline)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [dossier, setDossier] = useState<Dossier>({})
  const [score, setScore] = useState(0)
  const [expectedField, setExpectedField] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  // Address autocomplete
  const [adresseSuggestions, setAdresseSuggestions] = useState<AdresseSuggestion[]>([])
  const [adresseLoading, setAdresseLoading] = useState(false)
  const adresseTimer = useRef<NodeJS.Timeout | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }, 60)
    return () => clearTimeout(t)
  }, [messages, quickReplies, loading])

  // ── Address mode detection ───────────────────────────────────────────────
  const isAddressMode = expectedField === 'siteAddress'

  // ── Input change with address debounce ───────────────────────────────────
  const handleInputChange = useCallback(async (val: string) => {
    setInput(val)
    if (!isAddressMode) { setAdresseSuggestions([]); return }
    if (adresseTimer.current) clearTimeout(adresseTimer.current)
    if (val.length < 3) { setAdresseSuggestions([]); return }
    adresseTimer.current = setTimeout(async () => {
      setAdresseLoading(true)
      const suggestions = await fetchAdresses(val)
      setAdresseSuggestions(suggestions)
      setAdresseLoading(false)
    }, 300)
  }, [isAddressMode])

  // ── Fetch opener ─────────────────────────────────────────────────────────
  const fetchOpener = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], currentDossier: {}, artisanId }),
      })
      const data = await res.json()
      if (data.success) {
        const { text, options } = parseReply(data.reply)
        setMessages([{ role: 'assistant', content: text }])
        setQuickReplies(options)
      }
    } catch (e) {
      setMessages([{ role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider ?' }])
    } finally {
      setLoading(false)
    }
  }, [artisanId])

  // ── Apply API response ───────────────────────────────────────────────────
  const applyApiResponse = useCallback((data: any) => {
    const { text: replyText, options } = parseReply(data.reply ?? '')

    console.log('[KADRIA DEBUG] raw reply:', data.reply)
    console.log('[KADRIA DEBUG] parsed text:', replyText)
    console.log('[KADRIA DEBUG] parsed options:', options)
    console.log('[KADRIA DEBUG] expectedField:', data.expectedField)

    if (data.dossierUpdate) {
      setDossier(prev => {
        const updated = { ...prev }
        for (const [k, v] of Object.entries(data.dossierUpdate)) {
          if (v !== '' && v != null) (updated as any)[k] = v
        }
        if (data.aiSummary) updated.aiSummary = data.aiSummary
        return updated
      })
    }

    if (data.completenessScore > 0) setScore(data.completenessScore)
    setExpectedField(data.expectedField || null)

    if (data.readyToSave) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Parfait ! Vérifiez votre dossier et validez l\'envoi. 📋'
      }])
      setQuickReplies([])
      setExpectedField(null)
      setTimeout(() => setShowModal(true), 800)
      return
    }

    setMessages(prev => [...prev, { role: 'assistant', content: replyText }])
    setQuickReplies(options)
  }, [])

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? input).trim()
    if (!text || loading) return
    setInput('')
    setQuickReplies([])
    setAdresseSuggestions([])
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, currentDossier: dossier, artisanId }),
      })
      const data = await res.json()
      if (data.success) {
        applyApiResponse(data)
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur est survenue. Pouvez-vous reformuler ?" }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Problème de connexion. Veuillez réessayer." }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, messages, loading, dossier, artisanId, applyApiResponse])

  // ── Save dossier ─────────────────────────────────────────────────────────
  const saveDossier = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dossier,
          completenessScore: score,
          chatHistory: JSON.stringify(messages),
          source: 'chat-widget',
          artisanId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setShowModal(false)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Votre dossier a bien été transmis (réf. #${(data.recordId || '').slice(-6).toUpperCase()}). ${artisanName} va vous recontacter très prochainement. Merci !`
        }])
      } else {
        alert('Erreur lors de l\'envoi. Veuillez réessayer.')
      }
    } catch {
      alert('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  const step = score < 40 ? 1 : score < 70 ? 2 : score < 90 ? 3 : 4
  const stepLabel = ['', 'Projet', 'Détails', 'Coordonnées', 'Validation'][step]

  // ── Welcome screen ────────────────────────────────────────────────────────
  const WELCOME_OPTIONS = [
    'Nouveau projet', 'Travaux d\'amélioration',
    'Réparation / Dépannage', 'Entretien',
    'Intervention urgente', 'Je ne sais pas encore',
  ]

  // ── Widget bubble (non-inline, closed) ───────────────────────────────────
  if (!inline && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '60px', height: '60px', borderRadius: '50%',
          background: primaryColor, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        aria-label="Ouvrir le chat"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    )
  }

  // ── Container styles ──────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = inline ? {
    width: '100%', height: '600px', borderRadius: '16px',
    border: '1px solid #27272a', display: 'flex', flexDirection: 'column',
    overflow: 'hidden', background: '#09090b', fontFamily: 'system-ui, sans-serif',
  } : {
    position: 'fixed', bottom: '24px', right: '24px',
    width: '680px', maxWidth: 'calc(100vw - 32px)',
    height: '620px', borderRadius: '16px',
    border: '1px solid #27272a', display: 'flex', flexDirection: 'column',
    overflow: 'hidden', background: '#09090b',
    fontFamily: 'system-ui, sans-serif',
    zIndex: 9999, boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  }

  return (
    <>
      {/* ── Main widget ── */}
      <div style={containerStyle}>

        {/* Header */}
        <div style={{
          background: '#18181b', borderBottom: '1px solid #27272a',
          padding: '12px 16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: primaryColor, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '16px', color: 'black',
            }}>K</div>
            <div>
              <p style={{ margin: 0, color: 'white', fontWeight: 600, fontSize: '14px' }}>Kadria</p>
              <p style={{ margin: 0, color: '#a1a1aa', fontSize: '12px' }}>Assistant en ligne</p>
            </div>
          </div>
          {!inline && (
            <button onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '18px' }}>
              ✕
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{
          padding: '8px 16px', background: '#09090b',
          borderBottom: '1px solid #27272a', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Votre projet</span>
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Étape {step} sur 4 — {stepLabel}</span>
          </div>
          <div style={{ height: '3px', background: '#27272a', borderRadius: '2px' }}>
            <div style={{
              height: '100%', width: `${step * 25}%`,
              background: primaryColor, borderRadius: '2px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Welcome screen */}
        {showWelcome ? (
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div style={{
              background: '#18181b', border: '1px solid #27272a',
              borderRadius: '12px', padding: '16px', marginBottom: '16px',
            }}>
              <p style={{ margin: '0 0 6px', color: 'white', fontSize: '15px', fontWeight: 500 }}>
                👋 Bienvenue ! Quel projet souhaitez-vous réaliser ?
              </p>
              <p style={{ margin: 0, color: '#a1a1aa', fontSize: '13px' }}>
                Décrivez simplement votre besoin. Nous vous guiderons pour constituer un dossier complet.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {WELCOME_OPTIONS.map(opt => (
                <button key={opt} onClick={() => {
                  setShowWelcome(false)
                  fetchOpener().then(() => sendMessage(opt))
                }}
                  style={{
                    background: '#18181b', border: '1px solid #27272a',
                    color: 'white', borderRadius: '8px',
                    padding: '8px 14px', fontSize: '13px', cursor: 'pointer',
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1, overflowY: 'auto', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '78%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    background: msg.role === 'user' ? primaryColor : '#27272a',
                    color: msg.role === 'user' ? 'black' : 'white',
                    fontSize: '13.5px', lineHeight: '1.6',
                  }}>
                    {msg.role === 'assistant' ? (
                      <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                    ) : msg.content}
                  </div>
                </div>
              ))}

              {/* Loading dots */}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: '4px 12px 12px 12px',
                    background: '#27272a', display: 'flex', gap: '4px', alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#a1a1aa',
                        animation: `bounce 1s infinite ${i * 0.2}s`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick replies */}
              {!loading && quickReplies.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {quickReplies.map(opt => (
                    <button key={opt} onClick={() => sendMessage(opt)}
                      style={{
                        background: '#18181b', border: '1px solid #3f3f46',
                        color: 'white', borderRadius: '20px',
                        padding: '6px 14px', fontSize: '12.5px', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLButtonElement).style.background = primaryColor;
                        (e.target as HTMLButtonElement).style.color = 'black';
                        (e.target as HTMLButtonElement).style.borderColor = primaryColor
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLButtonElement).style.background = '#18181b';
                        (e.target as HTMLButtonElement).style.color = 'white';
                        (e.target as HTMLButtonElement).style.borderColor = '#3f3f46'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Address suggestions */}
            {isAddressMode && adresseSuggestions.length > 0 && (
              <div style={{
                background: '#18181b', border: '1px solid #27272a',
                borderRadius: '8px', margin: '0 12px',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {adresseSuggestions.map((s, i) => (
                  <div key={i}
                    onClick={() => {
                      setInput(s.label)
                      setAdresseSuggestions([])
                      setDossier(prev => ({
                        ...prev,
                        siteAddress: s.label,
                        city: s.city,
                        postalCode: s.postcode,
                      }))
                      sendMessage(s.label)
                    }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      borderBottom: i < adresseSuggestions.length - 1 ? '1px solid #27272a' : 'none',
                      color: 'white', fontSize: '13px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#27272a')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    📍 {s.label}
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            {!saved && (
              <div style={{
                padding: '10px 12px', borderTop: '1px solid #27272a',
                display: 'flex', gap: '8px', flexShrink: 0, background: '#09090b',
                position: 'relative',
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  onBlur={() => setTimeout(() => setAdresseSuggestions([]), 200)}
                  placeholder={isAddressMode ? "Tapez votre adresse..." : "Écrivez votre message..."}
                  disabled={loading}
                  style={{
                    flex: 1, background: '#18181b', border: '1px solid #3f3f46',
                    borderRadius: '8px', padding: '8px 12px',
                    color: 'white', fontSize: '13.5px', outline: 'none',
                  }}
                />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                  style={{
                    width: '38px', height: '38px', borderRadius: '8px', border: 'none',
                    background: loading || !input.trim() ? '#27272a' : primaryColor,
                    color: loading || !input.trim() ? '#71717a' : 'black',
                    cursor: loading || !input.trim() ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Validation Modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div style={{
            background: '#18181b', border: '1px solid #27272a',
            borderRadius: '16px', width: '100%', maxWidth: '520px',
            maxHeight: '90vh', overflowY: 'auto', padding: '24px',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 4px', color: 'white', fontWeight: 700, fontSize: '18px' }}>
                  📋 Votre dossier est prêt
                </p>
                <p style={{ margin: 0, color: '#a1a1aa', fontSize: '13px' }}>
                  Vérifiez les informations avant transmission à l'artisan.
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* Projet */}
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: primaryColor, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Projet
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {([
                ['Type de travaux', dossier.trade],
                ['Description', dossier.projectType],
                ['Budget', dossier.budget],
                ['Délai', dossier.desiredTimeline],
                ['Maturité', dossier.maturity],
                ['Adresse', dossier.siteAddress],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ background: '#27272a', borderRadius: '8px', padding: '10px' }}>
                  <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'white', fontWeight: 500 }}>{value}</p>
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #27272a', margin: '16px 0' }} />

            {/* Contact */}
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: primaryColor, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Contact
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {([
                ['Prénom', dossier.clientFirstName],
                ['Nom', dossier.clientName],
                ['Téléphone', dossier.clientPhone],
                ['Email', dossier.clientEmail],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ background: '#27272a', borderRadius: '8px', padding: '10px' }}>
                  <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'white', fontWeight: 500 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Résumé IA */}
            {dossier.aiSummary && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid #27272a', margin: '16px 0' }} />
                <p style={{ margin: '0 0 8px', fontSize: '11px', color: primaryColor, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Résumé IA
                </p>
                <p style={{
                  margin: 0, fontSize: '13px', color: '#d4d4d8', fontStyle: 'italic',
                  background: 'rgba(39,39,42,0.6)', borderRadius: '8px', padding: '12px',
                }}>
                  {dossier.aiSummary}
                </p>
              </>
            )}

            {/* Score */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Dossier complété à {score}%</span>
                <span style={{ fontSize: '12px', color: primaryColor, fontWeight: 600 }}>{score}%</span>
              </div>
              <div style={{ height: '4px', background: '#27272a', borderRadius: '2px' }}>
                <div style={{
                  height: '100%', width: `${score}%`,
                  background: primaryColor, borderRadius: '2px', transition: 'width 0.5s',
                }} />
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex', gap: '10px', marginTop: '20px',
              paddingTop: '16px', borderTop: '1px solid #27272a',
            }}>
              <button onClick={() => setShowModal(false)}
                style={{
                  flex: 1, border: '1px solid #3f3f46', background: 'transparent',
                  color: 'white', borderRadius: '10px', padding: '11px',
                  fontSize: '14px', cursor: 'pointer',
                }}>
                Annuler
              </button>
              <button onClick={saveDossier} disabled={saving}
                style={{
                  flex: 1, background: saving ? '#52525b' : primaryColor,
                  border: 'none', color: saving ? 'white' : 'black',
                  fontWeight: 700, borderRadius: '10px', padding: '11px',
                  fontSize: '14px', cursor: saving ? 'default' : 'pointer',
                }}>
                {saving ? 'Envoi en cours...' : 'Envoyer le dossier →'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  )
}
