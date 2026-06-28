'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Layers, Wrench, ShieldCheck, Zap, Compass } from 'lucide-react'

const WELCOME_OPTION_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Sparkles, Layers, Wrench, ShieldCheck, Zap, Compass,
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant'; content: string }
export interface Dossier {
  clientFirstName?: string; clientName?: string
  clientPhone?: string; clientEmail?: string
  siteAddress?: string; city?: string; postalCode?: string
  latitude?: number; longitude?: number
  trade?: string; projectType?: string; budget?: string
  desiredTimeline?: string; maturity?: string; aiSummary?: string
  photos?: { url: string; publicId: string }[]
  tradeAnswers?: { question: string; answer: string }[]
}
interface Props {
  artisanId?: string
  artisanName?: string
  primaryColor?: string
  secondaryColor?: string
  welcomeNameOverride?: string
  welcomeMessageOverride?: string
  inline?: boolean
  fullPage?: boolean
  fitParentHeight?: boolean
  projectExperience?: boolean
  previewMode?: boolean
  onDossierChange?: (dossier: Dossier, score: number) => void
  onArtisanNameChange?: (name: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseReply(raw?: string): { text: string; options: string[] } {
  if (!raw) return { text: '', options: [] }
  // Guard: if raw looks like a JSON object, extract the reply field to avoid displaying raw JSON
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed)
      if (typeof obj.reply === 'string' && obj.reply) {
        return { text: obj.reply.trim(), options: Array.isArray(obj.quickReplies) ? obj.quickReplies : [] }
      }
    } catch { /* not valid JSON, fall through */ }
  }
  const match = raw.match(/<<SUGGESTIONS>>([\s\S]*?)<<\/SUGGESTIONS>>/)
  if (!match) return { text: raw.trim(), options: [] }
  const options = match[1].split('|').map(o => o.trim()).filter(Boolean)
  const text = raw.replace(/<<SUGGESTIONS>>[\s\S]*?<<\/SUGGESTIONS>>/, '').trim()
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
interface AdresseSuggestion { label: string; city: string; postcode: string; latitude: number | null; longitude: number | null }

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
    longitude: f.geometry?.coordinates?.[0] ?? null,
    latitude: f.geometry?.coordinates?.[1] ?? null,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatWidgetInline({
  artisanId = '',
  artisanName = "l'artisan",
  primaryColor = '#22c55e',
  secondaryColor,
  welcomeNameOverride,
  welcomeMessageOverride,
  inline = true,
  fullPage = false,
  fitParentHeight = false,
  projectExperience = false,
  previewMode = false,
  onDossierChange,
  onArtisanNameChange,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [dossier, setDossier] = useState<Dossier>({})
  const [score, setScore] = useState(0)
  const [expectedField, setExpectedField] = useState<string | null>(null)
  const [readyToSave, setReadyToSave] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  // Address autocomplete
  const [adresseSuggestions, setAdresseSuggestions] = useState<AdresseSuggestion[]>([])
  const [adresseLoading, setAdresseLoading] = useState(false)
  const adresseTimer = useRef<NodeJS.Timeout | null>(null)
  // Photos
  const [photos, setPhotos] = useState<{ url: string; publicId: string }[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photosAnswered, setPhotosAnswered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Contact form
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactData, setContactData] = useState({
    firstName: '', lastName: '', phone: '', email: ''
  })

  // Config artisan
  const [primaryColorLocal, setPrimaryColorLocal] = useState(primaryColor)
  const [secondaryColorLocal, setSecondaryColorLocal] = useState('#09090b')
  const [widgetName, setWidgetName] = useState('Kadria')
  const [customWelcomeMessage, setCustomWelcomeMessage] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Charge la config artisan ─────────────────────────────────────────────
  useEffect(() => {
    // Si la couleur primaire est fournie via la prop (ex: query param), on l'utilise directement
    if (primaryColor) {
      setPrimaryColorLocal(primaryColor)
    }
    const loadConfig = async () => {
      if (!artisanId || artisanId === 'Artisan_demo') return
      try {
        const res = await fetch(`/api/artisan/public-config?artisan_id=${artisanId}`)
        const data = await res.json()
        if (data.success && data.config) {
          if (data.config.primaryColor && !primaryColor) setPrimaryColorLocal(data.config.primaryColor)
          if (data.config.secondaryColor) setSecondaryColorLocal(data.config.secondaryColor)
          if (data.config.welcomeName) setWidgetName(data.config.welcomeName)
          if (data.config.welcomeMessage) setCustomWelcomeMessage(data.config.welcomeMessage)
        }
      } catch (e) {
        console.error('Config load error:', e)
      }
    }
    loadConfig()
  }, [artisanId, primaryColor])

  // ── Surcharge locale (ex: aperçu temps réel dans les paramètres) ─────────
  useEffect(() => {
    if (secondaryColor) setSecondaryColorLocal(secondaryColor)
  }, [secondaryColor])
  useEffect(() => {
    if (welcomeNameOverride) setWidgetName(welcomeNameOverride)
  }, [welcomeNameOverride])
  useEffect(() => {
    if (welcomeMessageOverride) setCustomWelcomeMessage(welcomeMessageOverride)
  }, [welcomeMessageOverride])

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }, 60)
    return () => clearTimeout(t)
  }, [messages, quickReplies, loading])

  // ── Open modal when dossier is ready to save ──────────────────────────────
  useEffect(() => {
    if (readyToSave) setShowModal(true)
  }, [readyToSave])

  // ── Notifie le parent du dossier courant (ex: résumé live dans /projet) ──
  useEffect(() => {
    onDossierChange?.(dossier, score)
  }, [dossier, score, onDossierChange])

  // ── Notifie le parent du nom de l'artisan identifié (ex: header /projet) ──
  useEffect(() => {
    if (artisanId && artisanId !== 'Artisan_demo' && widgetName !== 'Kadria') {
      onArtisanNameChange?.(widgetName)
    }
  }, [artisanId, widgetName, onArtisanNameChange])

  // ── Address mode detection ───────────────────────────────────────────────
  const isAddressMode = expectedField === 'siteAddress'

  // ── Photo mode detection ─────────────────────────────────────────────────
  // Use expectedField (set from API response) as primary signal; fall back to
  // text-based detection in case the field is missing
  const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop()
  const isPhotoMode = expectedField === 'photos' ||
    lastAssistantMsg?.content?.toLowerCase().includes('photo') ||
    lastAssistantMsg?.content?.includes('📸')

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
        const { text } = parseReply(data.reply)
        const options = Array.isArray(data.quickReplies) && data.quickReplies.length > 0
          ? data.quickReplies
          : parseReply(data.reply ?? '').options
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
    const { text: replyText } = parseReply(data.reply ?? '')
    const options = Array.isArray(data.quickReplies) && data.quickReplies.length > 0
      ? data.quickReplies
      : parseReply(data.reply ?? '').options

    console.log('[KADRIA DEBUG] raw reply:', data.reply)
    console.log('[KADRIA DEBUG] parsed text:', replyText)
    console.log('[KADRIA DEBUG] parsed options:', options)
    console.log('[KADRIA DEBUG] expectedField:', data.expectedField)

    if (data.dossierUpdate) {
      setDossier(prev => {
        const updated = { ...prev }
        for (const [k, v] of Object.entries(data.dossierUpdate)) {
          if (k === 'tradeAnswers') continue
          if (v !== '' && v != null) (updated as any)[k] = v
        }
        if (data.aiSummary) updated.aiSummary = data.aiSummary
        return updated
      })
    }

    if (data.dossierUpdate?.tradeAnswers?.length > 0) {
      setDossier(prev => ({
        ...prev,
        tradeAnswers: [
          ...(prev.tradeAnswers || []),
          ...data.dossierUpdate.tradeAnswers.filter(
            (newItem: { question: string; answer: string }) =>
              !(prev.tradeAnswers || []).some(
                existing => existing.question === newItem.question
              )
          )
        ]
      }))
    }

    if (data.completenessScore > 0) setScore(data.completenessScore)
    setExpectedField(data.expectedField || null)

    if (data.expectedField === 'contactForm') {
      setShowContactForm(true)
    }

    if (data.readyToSave) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Parfait ! Vérifiez votre dossier et validez l\'envoi. 📋'
      }])
      setQuickReplies([])
      setExpectedField(null)
      setTimeout(() => setReadyToSave(true), 800)
      return
    }

    setMessages(prev => [...prev, { role: 'assistant', content: replyText }])
    setQuickReplies(options)
  }, [])

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? input).trim()
    if (!text || loading) return
    if (text.toLowerCase().includes('pas de photos')) setPhotosAnswered(true)
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

  // ── Upload photos ────────────────────────────────────────────────────────
  const uploadPhotos = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadingPhotos(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => formData.append('files', file))
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setPhotos(prev => [
          ...prev,
          ...data.files.map((f: { url: string; publicId: string }) => ({ url: f.url, publicId: f.publicId })),
        ])
        await sendMessage(`J'ai ajouté ${data.files.length} photo(s) à mon dossier.`)
        setPhotosAnswered(true)
      } else {
        alert('Erreur lors de l\'envoi des photos. Veuillez réessayer.')
      }
    } catch {
      alert('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setUploadingPhotos(false)
    }
  }, [sendMessage])

  // ── Save dossier ─────────────────────────────────────────────────────────
  const saveDossier = async () => {
    if (previewMode) {
      setSaving(true)
      setSaved(true)
      setShowModal(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ [Aperçu] Ce message simule l'envoi du dossier — aucun dossier réel n'a été créé en mode test.`
      }])
      setSaving(false)
      return
    }
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
          photos: photos.map(p => p.url),
          photoCount: photos.length,
          tradeAnswers: dossier.tradeAnswers || [],
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
  const isProjectExperience = fullPage && projectExperience
  const visualStep = showContactForm || readyToSave || saved
    ? 4
    : isPhotoMode || photos.length > 0
      ? 3
      : step >= 2
        ? 2
        : 1
  const PROJECT_STEP_LABELS = ['Projet', 'Détails', 'Photos', 'Coordonnées']

  // ── Welcome screen ────────────────────────────────────────────────────────
  const WELCOME_OPTIONS = [
    'Nouveau projet', 'Travaux d\'amélioration',
    'Réparation / Dépannage', 'Entretien',
    'Intervention urgente', 'Je ne sais pas encore',
  ]
  const WELCOME_OPTION_DETAILS: Record<string, { icon: string; description: string }> = {
    'Nouveau projet': { icon: 'Sparkles', description: 'Créer ou installer quelque chose de nouveau' },
    'Travaux d\'amélioration': { icon: 'Layers', description: 'Moderniser, optimiser ou faire évoluer un existant' },
    'Réparation / Dépannage': { icon: 'Wrench', description: 'Résoudre un problème existant' },
    'Entretien': { icon: 'ShieldCheck', description: 'Entretenir pour prévenir les pannes et l usure' },
    'Intervention urgente': { icon: 'Zap', description: 'Besoin rapide ou situation bloquante' },
    'Je ne sais pas encore': { icon: 'Compass', description: 'Kadria vous aide à clarifier votre besoin' },
  }

  // Cartes compactes du widget (4 entrées premium). Les libellés envoyés au
  // chat reprennent volontairement les valeurs existantes de WELCOME_OPTIONS
  // pour ne rien changer à la détection des intentions côté /api/chat.
  const WIDGET_QUICK_CARDS: { title: string; subtitle: string; icon: string; value: string }[] = [
    { title: 'Dépannage', subtitle: 'Une intervention rapide', icon: '🔧', value: 'Réparation / Dépannage' },
    { title: 'Travaux', subtitle: 'Projet, rénovation, amélioration', icon: '🏗️', value: 'Travaux d\'amélioration' },
    { title: 'Entretien', subtitle: 'Maintenance, nettoyage ou vérification', icon: '🧹', value: 'Entretien' },
    { title: 'Je ne sais pas encore', subtitle: 'Aidez-moi à clarifier mon besoin', icon: '🧭', value: 'Je ne sais pas encore' },
  ]

  // ── Container styles ──────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = fullPage ? {
    width: '100%',
    height: '100%',
    borderRadius: isProjectExperience ? '28px' : '0',
    border: isProjectExperience ? '1px solid rgba(255,255,255,0.08)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: isProjectExperience
      ? 'linear-gradient(180deg, rgba(24,24,27,0.98) 0%, rgba(9,9,11,0.98) 100%)'
      : secondaryColorLocal,
    boxShadow: isProjectExperience ? '0 28px 80px rgba(0,0,0,0.36)' : 'none',
    fontFamily: 'system-ui, sans-serif',
  } : {
    width: '100%', height: fitParentHeight ? '100%' : '600px', borderRadius: '16px',
    border: '1px solid #27272a', display: 'flex', flexDirection: 'column',
    overflow: 'hidden', background: secondaryColorLocal, fontFamily: 'system-ui, sans-serif',
  }

  // ── Centered wrapper for full-page mode ──────────────────────────────────
  const centerStyle: React.CSSProperties = fullPage ? {
    maxWidth: isProjectExperience ? '920px' : '760px',
    width: '100%',
    margin: '0 auto',
    padding: isProjectExperience ? '0 20px' : '0 24px',
  } : {}

  return (
    <>
      {/* ── Main widget ── */}
      <div style={containerStyle}>

        {/* Header */}
        <div className={isProjectExperience ? 'project-mobile-hide-header' : undefined} style={{
          background: isProjectExperience
            ? 'linear-gradient(180deg, rgba(18,18,20,0.96) 0%, rgba(18,18,20,0.88) 100%)'
            : 'linear-gradient(180deg, rgba(15,16,15,0.97) 0%, rgba(9,9,11,0.97) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: isProjectExperience ? '18px 20px 16px' : '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ ...centerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: isProjectExperience ? '44px' : '38px',
                height: isProjectExperience ? '44px' : '38px',
                borderRadius: isProjectExperience ? '14px' : '12px',
                background: isProjectExperience
                  ? `linear-gradient(135deg, ${primaryColorLocal} 0%, #a3e635 100%)`
                  : `linear-gradient(145deg, ${primaryColorLocal} 0%, #0f3d24 130%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: isProjectExperience ? '18px' : '15px',
                color: isProjectExperience ? '#04110a' : '#ecfdf5',
                boxShadow: isProjectExperience ? '0 12px 28px rgba(34,197,94,0.18)' : '0 6px 18px rgba(34,197,94,0.22)',
                border: isProjectExperience ? 'none' : '1px solid rgba(255,255,255,0.12)',
                flexShrink: 0,
              }}>K</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: isProjectExperience ? '15px' : '14.5px', letterSpacing: '-0.01em' }}>{widgetName}</p>
                  {!isProjectExperience && (
                    <span style={{
                      border: '1px solid rgba(34,197,94,0.22)',
                      background: 'rgba(34,197,94,0.08)',
                      color: '#86efac',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>
                      Réponse en 3 min
                    </span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0', color: '#a1a1aa', fontSize: isProjectExperience ? '12.5px' : '12px' }}>
                  {isProjectExperience ? 'Assistant de qualification guide' : "Votre assistant de confiance pour vos travaux"}
                </p>
              </div>
            </div>
            {isProjectExperience && (
              <div style={{
                border: '1px solid rgba(34,197,94,0.2)',
                background: 'rgba(34,197,94,0.08)',
                color: '#dcfce7',
                borderRadius: '999px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                Quelques questions · Transmission directe
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className={isProjectExperience ? 'project-progress-wrap' : undefined} style={{
          padding: isProjectExperience ? '16px 20px 18px' : '8px 16px',
          background: isProjectExperience ? 'rgba(9,9,11,0.68)' : '#09090b',
          borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        }}>
          <div style={centerStyle}>
            {isProjectExperience && (
              <div className="project-progress-compact-row" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#d4d4d8', fontWeight: 600 }}>
                  Étape {visualStep}/4 · {PROJECT_STEP_LABELS[visualStep - 1]}
                </span>
              </div>
            )}
            <div className={isProjectExperience ? 'project-progress-full-row' : undefined} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isProjectExperience ? '12px' : '5px', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: isProjectExperience ? '12px' : '11px', color: isProjectExperience ? '#d4d4d8' : '#a1a1aa', fontWeight: isProjectExperience ? 600 : 400 }}>
                {isProjectExperience ? 'Parcours de qualification' : 'Votre projet'}
              </span>
              <span style={{ fontSize: isProjectExperience ? '12px' : '11px', color: '#a1a1aa' }}>
                Étape {isProjectExperience ? visualStep : step} sur 4{isProjectExperience ? '' : ` — ${stepLabel}`}
              </span>
            </div>
            <div style={{ height: isProjectExperience ? '6px' : '3px', background: isProjectExperience ? 'rgba(255,255,255,0.08)' : '#27272a', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${(isProjectExperience ? visualStep : step) * 25}%`,
                background: isProjectExperience ? `linear-gradient(90deg, ${primaryColorLocal} 0%, #86efac 100%)` : primaryColorLocal, borderRadius: '999px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            {isProjectExperience && (
              <div className="project-step-line" style={{ marginTop: '10px' }}>
                {PROJECT_STEP_LABELS.map((label, index) => {
                  const isActive = index + 1 === visualStep
                  const isDone = index + 1 < visualStep
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '999px',
                        background: isActive || isDone ? primaryColorLocal : 'rgba(255,255,255,0.08)',
                        color: isActive || isDone ? '#04110a' : '#a1a1aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {isDone ? '✓' : index + 1}
                      </span>
                      <span style={{ color: isActive ? 'white' : '#71717a', fontSize: '12px', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Welcome screen */}
        {showWelcome ? isProjectExperience ? (
          <div className="project-welcome-wrap" style={{ flex: 1, padding: '24px 0 28px', overflowY: 'auto' }}>
            <div style={centerStyle}>
              <div style={{ marginBottom: '20px' }}>
                <h2 className="project-welcome-title" style={{ margin: '0 0 6px', color: 'white', fontSize: '22px', lineHeight: 1.25, fontWeight: 700 }}>
                  Quel type de demande souhaitez-vous transmettre ?
                </h2>
                <p style={{ margin: 0, color: '#a1a1aa', fontSize: '13.5px', lineHeight: 1.6 }}>
                  {customWelcomeMessage || 'Choisissez l’option la plus proche de votre besoin. Vous pourrez préciser ensuite.'}
                </p>
              </div>
              <div className="project-choice-grid">
                {WELCOME_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setShowWelcome(false)
                      fetchOpener().then(() => sendMessage(opt))
                    }}
                    className="project-choice-card"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'white',
                      borderRadius: '18px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minHeight: 'auto',
                      transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease',
                    }}>
                    <div className="project-choice-icon" style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      flexShrink: 0,
                      background: 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.18)',
                      color: '#86efac',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}>
                      {(() => {
                        const IconComp = WELCOME_OPTION_ICONS[WELCOME_OPTION_DETAILS[opt]?.icon || '']
                        return IconComp ? <IconComp size={18} /> : null
                      })()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'white', fontSize: '14.5px', fontWeight: 650, marginBottom: '2px' }}>{opt}</div>
                      <div style={{ color: '#a1a1aa', fontSize: '12.5px', lineHeight: 1.5 }}>
                        {WELCOME_OPTION_DETAILS[opt]?.description}
                      </div>
                    </div>
                    <span style={{ color: '#52525b', fontSize: '16px', flexShrink: 0 }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, padding: '18px 16px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              background: 'linear-gradient(180deg, rgba(24,24,27,0.9) 0%, rgba(13,18,15,0.88) 100%)',
              border: '1px solid rgba(34,197,94,0.14)',
              borderRadius: '18px',
              padding: '18px',
              marginBottom: '14px',
              boxShadow: '0 14px 36px rgba(0,0,0,0.22)',
            }}>
              <p style={{ margin: '0 0 6px', color: 'white', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                Parlez-moi de votre projet
              </p>
              <p style={{ margin: 0, color: '#a1a1aa', fontSize: '13px', lineHeight: 1.6 }}>
                {customWelcomeMessage || 'Je vous guide en quelques questions pour trouver les bons artisans, rapidement.'}
              </p>
            </div>
            <div className="widget-quick-grid">
              {WIDGET_QUICK_CARDS.map(card => (
                <button
                  key={card.title}
                  onClick={() => {
                    setShowWelcome(false)
                    fetchOpener().then(() => sendMessage(card.value))
                  }}
                  className="widget-quick-card"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: 'white',
                    borderRadius: '16px',
                    padding: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minHeight: '96px',
                    transition: 'transform 0.16s ease, border-color 0.16s ease, background 0.16s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '17px' }}>{card.icon}</span>
                    <span style={{ color: '#52525b', fontSize: '13px' }}>→</span>
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '13.5px', fontWeight: 650, marginBottom: '3px' }}>{card.title}</div>
                    <div style={{ color: '#a1a1aa', fontSize: '11.5px', lineHeight: 1.5 }}>{card.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && input.trim()) {
                    const text = input
                    setShowWelcome(false)
                    fetchOpener().then(() => sendMessage(text))
                  }
                }}
                placeholder="Ou décrivez directement votre besoin..."
                style={{
                  flex: 1, background: '#18181b', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '10px 12px', color: 'white', fontSize: '13px', outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  if (!input.trim()) return
                  const text = input
                  setShowWelcome(false)
                  fetchOpener().then(() => sendMessage(text))
                }}
                disabled={!input.trim()}
                style={{
                  width: '40px', height: '40px', borderRadius: '12px', border: 'none',
                  background: input.trim() ? primaryColorLocal : '#27272a',
                  color: input.trim() ? 'black' : '#71717a',
                  cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1, overflowY: 'auto', padding: fullPage ? (isProjectExperience ? '20px 0 12px' : '12px 16px') : '16px',
              display: 'flex', flexDirection: 'column',
            }}>
              <div className="chat-messages-container" style={{
                ...centerStyle,
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
              {messages.map((msg, i) => {
                const isExcluded = msg.role === 'assistant' &&
                  msg.content.includes("ne fait pas partie des prestations que l'artisan souhaite traiter")
                return (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: isProjectExperience ? '82%' : '78%', padding: isProjectExperience ? '12px 15px' : '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 6px 16px 16px' : '6px 16px 16px 16px',
                      background: msg.role === 'user' ? primaryColorLocal : isExcluded ? 'rgba(217,119,6,0.12)' : '#27272a',
                      border: isExcluded ? '1px solid rgba(217,119,6,0.35)' : 'none',
                      color: msg.role === 'user' ? 'black' : isExcluded ? '#fde68a' : 'white',
                      fontSize: isProjectExperience ? '14px' : '13.5px', lineHeight: '1.7',
                      boxShadow: isProjectExperience ? '0 10px 24px rgba(0,0,0,0.14)' : 'none',
                    }}>
                      {isExcluded && (
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', color: '#fbbf24' }}>
                          ⚠️ Hors périmètre
                        </span>
                      )}
                      {msg.role === 'assistant' ? (
                        <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      ) : msg.content}
                    </div>
                  </div>
                )
              })}

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

              {/* Photo buttons */}
              {!loading && isPhotoMode && !showContactForm && !photosAnswered && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {isProjectExperience && (
                    <p style={{ margin: 0, color: '#a1a1aa', fontSize: '12.5px', lineHeight: 1.5 }}>
                      Une photo aide l'artisan à mieux comprendre votre besoin.
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    style={{
                      background: '#18181b',
                      border: '1px solid #22c55e',
                      color: '#22c55e',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    📸 J'ajoute mes photos
                  </button>
                  <button
                    onClick={() => sendMessage("Je n'ai pas de photos pour le moment")}
                    style={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      color: '#a1a1aa',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Passer →
                  </button>
                  </div>
                </div>
              )}

              {/* Quick replies */}
              {!loading && !isPhotoMode && !showContactForm && quickReplies.length > 0 && (
                <div style={{
                  display: 'flex', flexWrap: 'nowrap', overflowX: 'auto',
                  gap: '6px', marginTop: '4px', paddingBottom: '8px',
                  WebkitOverflowScrolling: 'touch',
                }}>
                  {quickReplies.map(opt => (
                    <button key={opt} onClick={() => sendMessage(opt)}
                      style={{
                        background: '#18181b', border: '1px solid #3f3f46',
                        color: 'white', borderRadius: '20px',
                        padding: '6px 14px', fontSize: '12.5px', cursor: 'pointer',
                        transition: 'all 0.15s', flexShrink: 0,
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLButtonElement).style.background = primaryColorLocal;
                        (e.target as HTMLButtonElement).style.color = 'black';
                        (e.target as HTMLButtonElement).style.borderColor = primaryColorLocal
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
            </div>

            {/* Address suggestions */}
            {isAddressMode && adresseSuggestions.length > 0 && (
              <div style={centerStyle}>
                <div style={{
                  background: '#18181b', border: '1px solid #27272a',
                  borderRadius: '8px', margin: fullPage ? 0 : '0 12px',
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
                          latitude: s.latitude ?? undefined,
                          longitude: s.longitude ?? undefined,
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
              </div>
            )}

            {/* Contact form */}
            {showContactForm && !saved && (
              <div style={centerStyle}>
              <div style={{
                  ...(fullPage ? { padding: isProjectExperience ? '0 20px' : '0 24px' } : { padding: '0 12px' }),
                }}>
                  <div style={{
                    background: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '16px',
                    padding: '20px',
                    margin: '8px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <p style={{
                      margin: '0 0 4px',
                      color: '#22c55e',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      Vos coordonnées
                    </p>

                    {/* Grid 2 colonnes */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[
                        { key: 'firstName', label: 'Prénom', placeholder: 'Jean', type: 'text' },
                        { key: 'lastName', label: 'Nom', placeholder: 'Dupont', type: 'text' },
                        { key: 'phone', label: 'Téléphone', placeholder: '06 12 34 56 78', type: 'tel' },
                        { key: 'email', label: 'Email', placeholder: 'jean@email.com', type: 'email' },
                      ].map(field => (
                        <div key={field.key}>
                          <label style={{
                            display: 'block',
                            fontSize: '11px',
                            color: '#a1a1aa',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={contactData[field.key as keyof typeof contactData]}
                            onChange={e => setContactData(prev => ({
                              ...prev,
                              [field.key]: e.target.value
                            }))}
                            style={{
                              width: '100%',
                              background: '#27272a',
                              border: '1px solid #3f3f46',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              color: 'white',
                              fontSize: '16px',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={async () => {
                        const { firstName, lastName, phone, email } = contactData
                        if (!firstName || !lastName || !phone || !email) {
                          alert('Veuillez remplir tous les champs.')
                          return
                        }
                        setDossier(prev => ({
                          ...prev,
                          clientFirstName: firstName,
                          clientName: lastName,
                          clientPhone: phone,
                          clientEmail: email,
                        }))
                        setShowContactForm(false)
                        const summary = `Prénom: ${firstName}, Nom: ${lastName}, Téléphone: ${phone}, Email: ${email}`
                        await sendMessage(summary)
                      }}
                      style={{
                        background: '#22c55e',
                        border: 'none',
                        color: 'black',
                        fontWeight: 700,
                        borderRadius: '10px',
                        padding: '12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        width: '100%',
                        marginTop: '4px',
                      }}
                    >
                      Valider mes coordonnées →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Photo thumbnails */}
            {photos.length > 0 && !saved && (
              <div style={{
                padding: fullPage ? '0' : '0 12px',
                flexShrink: 0, background: '#09090b',
              }}>
                <div style={{
                  ...centerStyle,
                  ...(fullPage ? { padding: isProjectExperience ? '0 20px' : '0 24px' } : {}),
                  display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: '10px',
                }}>
                  {photos.map((photo, i) => (
                    <div key={photo.publicId} style={{
                      position: 'relative', width: '60px', height: '60px',
                      borderRadius: '8px', overflow: 'hidden', border: '1px solid #27272a',
                    }}>
                      <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        style={{
                          position: 'absolute', top: '2px', right: '2px',
                          width: '18px', height: '18px', borderRadius: '50%',
                          border: 'none', background: 'rgba(0,0,0,0.7)', color: 'white',
                          fontSize: '11px', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
                        }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bouton retour vers la modale */}
            {readyToSave && !showModal && !saved && (
              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid #27272a',
                background: '#09090b',
                display: 'flex',
                justifyContent: 'center',
              }}>
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #22c55e',
                    color: '#22c55e',
                    borderRadius: '10px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📋 Voir mon dossier et valider →
                </button>
              </div>
            )}

            {/* CTA vers la page complète */}
            {!isProjectExperience && !saved && (
              <div style={{ padding: '0 12px 8px', flexShrink: 0, background: '#09090b', textAlign: 'center' }}>
                <a
                  href={`/projet?artisan_id=${encodeURIComponent(artisanId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="widget-footer-cta"
                  style={{
                    color: '#a1a1aa',
                    fontSize: '11.5px',
                    textDecoration: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.14)',
                    paddingBottom: '1px',
                    transition: 'color 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  Continuer sur la page complète →
                </a>
              </div>
            )}

            {/* Input */}
            {!saved && !showContactForm && (
              <div className="chat-input-container" style={{
                padding: fullPage ? '10px 0' : '10px 12px', borderTop: '1px solid #27272a',
                flexShrink: 0, background: isProjectExperience ? 'rgba(9,9,11,0.86)' : '#09090b',
                position: 'relative',
              }}>
                <div style={{
                  ...centerStyle,
                  ...(fullPage ? { padding: isProjectExperience ? '0 20px calc(20px + env(safe-area-inset-bottom, 0px))' : '0 24px 24px' } : {}),
                  display: 'flex', gap: '8px',
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
                      flex: 1, background: '#18181b', border: `1px solid ${isProjectExperience ? 'rgba(255,255,255,0.1)' : '#3f3f46'}`,
                      borderRadius: isProjectExperience ? '14px' : '8px',
                      padding: fullPage ? '14px 16px' : '8px 12px',
                      color: 'white', fontSize: fullPage ? '16px' : '13.5px', outline: 'none',
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      uploadPhotos(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  {isPhotoMode && !photosAnswered && (
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhotos}
                      style={{
                        width: '42px', height: '42px', borderRadius: isProjectExperience ? '14px' : '8px', border: '1px solid #3f3f46',
                        background: '#18181b', color: 'white',
                        cursor: uploadingPhotos ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: '16px',
                      }}>
                      {uploadingPhotos ? '⏳' : '📸'}
                    </button>
                  )}
                  <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                    style={{
                       width: '42px', height: '42px', borderRadius: isProjectExperience ? '14px' : '8px', border: 'none',
                      background: loading || !input.trim() ? '#27272a' : primaryColorLocal,
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
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: primaryColorLocal, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: primaryColorLocal, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
                <p style={{ margin: '0 0 8px', fontSize: '11px', color: primaryColorLocal, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
                <span style={{ fontSize: '12px', color: primaryColorLocal, fontWeight: 600 }}>{score}%</span>
              </div>
              <div style={{ height: '4px', background: '#27272a', borderRadius: '2px' }}>
                <div style={{
                  height: '100%', width: `${score}%`,
                  background: primaryColorLocal, borderRadius: '2px', transition: 'width 0.5s',
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
                {isProjectExperience ? 'Modifier mes réponses' : 'Annuler'}
              </button>
              <button onClick={saveDossier} disabled={saving}
                style={{
                  flex: 1, background: saving ? '#52525b' : primaryColorLocal,
                  border: 'none', color: saving ? 'white' : 'black',
                  fontWeight: 700, borderRadius: '10px', padding: '11px',
                  fontSize: '14px', cursor: saving ? 'default' : 'pointer',
                }}>
                {saving ? 'Envoi en cours...' : isProjectExperience ? 'Transmettre ma demande' : 'Envoyer le dossier →'}
              </button>
            </div>
            {isProjectExperience && (
              <p style={{ margin: '12px 0 0', color: '#71717a', fontSize: '12px', lineHeight: 1.5, textAlign: 'center' }}>
                Votre demande sera envoyée à l&apos;artisan avec les informations utiles pour vous répondre.
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        .project-step-line {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .project-choice-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .project-choice-card:hover {
          transform: translateY(-2px);
          border-color: rgba(34,197,94,0.28) !important;
          background: linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(255,255,255,0.03) 100%) !important;
        }
        .widget-quick-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .widget-quick-card:hover {
          transform: translateY(-1px);
          border-color: rgba(34,197,94,0.26) !important;
          background: linear-gradient(180deg, rgba(34,197,94,0.09) 0%, rgba(255,255,255,0.02) 100%) !important;
        }
        .widget-footer-cta:hover {
          border-color: rgba(34,197,94,0.32) !important;
          color: #86efac !important;
        }
        @media (max-width: 640px) {
          .project-choice-grid {
            grid-template-columns: 1fr;
          }
          .chat-messages-container {
            max-width: 100% !important;
            padding: 0 12px !important;
          }
          .chat-input-container {
            max-width: 100% !important;
            padding: 12px !important;
          }
          .project-mobile-hide-header {
            display: none !important;
          }
          .project-progress-wrap {
            padding: 10px 16px 12px !important;
          }
          .project-progress-full-row {
            display: none !important;
          }
          .project-progress-compact-row {
            display: flex !important;
          }
          .project-step-line {
            display: none !important;
          }
          .project-welcome-wrap {
            padding: 14px 0 20px !important;
          }
          .project-welcome-title {
            font-size: 18px !important;
            margin-bottom: 4px !important;
          }
          .project-choice-card {
            padding: 11px 13px !important;
            gap: 10px !important;
            border-radius: 16px !important;
          }
          .project-choice-icon {
            width: 32px !important;
            height: 32px !important;
            border-radius: 10px !important;
          }
          .project-choice-grid {
            gap: 9px !important;
          }
        }
      `}</style>
    </>
  )
}
