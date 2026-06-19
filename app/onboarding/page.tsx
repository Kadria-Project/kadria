'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import { useTheme } from '@/src/hooks/useTheme'

const TRADES = [
  'Plombier', 'Électricien', 'Maçon', 'Peintre', 'Menuisier',
  'Couvreur', 'Carreleur', 'Chauffagiste', 'Paysagiste',
  'Pisciniste', 'Rénovation globale', 'Autre',
]

const SECTIONS = [
  { id: 'entreprise', label: 'Mon entreprise', icon: '🏢' },
  { id: 'widget', label: 'Mon widget', icon: '🎨' },
  { id: 'contact', label: 'Coordonnées', icon: '📍' },
  { id: 'legal', label: 'Infos légales', icon: '📋' },
  { id: 'apparence', label: 'Apparence', icon: '🌓' },
]

const FORMES_JURIDIQUES = [
  'Auto-entrepreneur', 'EI', 'EURL', 'SARL', 'SAS', 'SASU', 'Autre',
]

const DEVIS_VALIDITES = [30, 60, 90]
const DEVIS_TVA_TAUX = [5.5, 10, 20]

type LegalConfig = {
  raisonSociale: string
  formeJuridique: string
  siret: string
  tvaNumber: string
  tvaAssujetti: boolean
  adressePro: string
  cpPro: string
  villePro: string
  assureur: string
  numAssurance: string
  assuranceNonRequise: boolean
  devisPrefixe: string
  devisValidite: number
  devisTvaDefaut: number
  devisConditionsPaiement: string
  devisMentionLegale: string
}

function validateLegalConfig(config: LegalConfig): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!config.raisonSociale.trim()) errors.raisonSociale = 'La raison sociale est requise'
  if (!config.formeJuridique.trim()) errors.formeJuridique = 'La forme juridique est requise'

  if (!config.siret.trim()) {
    errors.siret = 'Le SIRET est requis'
  } else if (!/^\d{14}$/.test(config.siret.trim())) {
    errors.siret = 'Le SIRET doit contenir exactement 14 chiffres'
  }

  if (!config.adressePro.trim()) errors.adressePro = "L'adresse professionnelle est requise"
  if (!config.cpPro.trim()) errors.cpPro = 'Le code postal est requis'
  if (!config.villePro.trim()) errors.villePro = 'La ville est requise'

  if (!config.assuranceNonRequise) {
    if (!config.assureur.trim()) errors.assureur = "Le nom de l'assureur est requis"
    if (!config.numAssurance.trim()) errors.numAssurance = "Le numéro de police d'assurance décennale est requis"
  }

  if (config.devisPrefixe && config.devisPrefixe.length > 6) {
    errors.devisPrefixe = 'Le préfixe ne peut pas dépasser 6 caractères'
  }

  return errors
}

export default function OnboardingPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [activeSection, setActiveSection] = useState('entreprise')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState({
    companyName: '',
    primaryTrade: '',
    phone: '',
    address: '',
    hours: '',
    logoUrl: '',
    welcomeName: '',
    welcomeMessage: '',
    primaryColor: '#22c55e',
    secondaryColor: 'var(--bg-elevated)',
    websiteUrl: '',
    raisonSociale: '',
    formeJuridique: '',
    siret: '',
    tvaNumber: '',
    tvaAssujetti: true,
    adressePro: '',
    cpPro: '',
    villePro: '',
    assureur: '',
    numAssurance: '',
    assuranceNonRequise: false,
    devisPrefixe: 'DEV',
    devisValidite: 90,
    devisTvaDefaut: 10,
    devisConditionsPaiement: '',
    devisMentionLegale: '',
  })

  const [legalErrors, setLegalErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')

  const [artisanIdDisplay, setArtisanIdDisplay] = useState('VOTRE_ARTISAN_ID')
  const [copied, setCopied] = useState(false)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/artisan/config')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.config) {
          setConfig({
            companyName: data.config.companyName || '',
            primaryTrade: data.config.primaryTrade || '',
            phone: data.config.phone || '',
            address: data.config.address || '',
            hours: data.config.hours || '',
            logoUrl: data.config.logoUrl || '',
            welcomeName: data.config.welcomeName || '',
            welcomeMessage: data.config.welcomeMessage || '',
            primaryColor: data.config.primaryColor || '#22c55e',
            secondaryColor: data.config.secondaryColor || 'var(--bg-elevated)',
            websiteUrl: data.config.websiteUrl || '',
            raisonSociale: data.config.raisonSociale || '',
            formeJuridique: data.config.formeJuridique || '',
            siret: data.config.siret || '',
            tvaNumber: data.config.tvaNumber || '',
            tvaAssujetti: data.config.tvaAssujetti !== false,
            adressePro: data.config.adressePro || '',
            cpPro: data.config.cpPro || '',
            villePro: data.config.villePro || '',
            assureur: data.config.assureur || '',
            numAssurance: data.config.numAssurance || '',
            assuranceNonRequise: data.config.assuranceNonRequise || false,
            devisPrefixe: data.config.devisPrefixe || 'DEV',
            devisValidite: data.config.devisValidite || 90,
            devisTvaDefaut: data.config.devisTvaDefaut || 10,
            devisConditionsPaiement: data.config.devisConditionsPaiement || '',
            devisMentionLegale: data.config.devisMentionLegale || '',
          })
          if (data.config.artisanId) {
            setArtisanIdDisplay(data.config.artisanId)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])


  const save = async () => {
    const errors = validateLegalConfig(config)
    setLegalErrors(errors)

    if (Object.keys(errors).length > 0) {
      setActiveSection('legal')
      return
    }

    setSaving(true)
    setSaved(false)
    setSaveError('')
    try {
      const res = await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('[ONBOARDING SAVE]', error)
      setSaveError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--text-1)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'system-ui',
  }

  const labelStyle: React.CSSProperties = {
    color: 'var(--text-2)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  }

  const errorStyle: React.CSSProperties = {
    color: '#f87171',
    fontSize: '12px',
    margin: '6px 0 0',
  }

  const checkboxRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-2)',
    fontSize: '13px',
    cursor: 'pointer',
  }

  const sectionCard: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-2)', fontFamily: 'system-ui',
    }}>
      Chargement...
    </div>
  )

  return (
    <main className="dashboard-shell" style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'system-ui, sans-serif',
      color: 'var(--text-1)',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push('/dashboard-v2')}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-2)', cursor: 'pointer', fontSize: '14px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            ← Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <KadriaLogo size="sm" theme="dark" noLink />
            <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '14px' }}>
              · Configuration
            </span>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: saved ? 'rgba(34,197,94,0.2)' : saving ? 'var(--bg-hover)' : 'var(--accent)',
            border: saved ? '1px solid var(--accent)' : 'none',
            color: saved ? '#4ade80' : saving ? 'var(--text-3)' : 'black',
            fontWeight: 700, borderRadius: '10px',
            padding: '10px 24px', fontSize: '14px',
            cursor: saving ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saved ? '✓ Sauvegardé' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {saveError && (
        <div style={{
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          margin: '16px 32px 0',
          color: '#f87171',
          fontSize: '13px',
        }}>
          {saveError}
        </div>
      )}

      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: isMobile ? '16px 12px' : '32px 24px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '220px 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Sidebar navigation */}
        <div style={isMobile ? {} : { position: 'sticky', top: '80px' }}>
          <div style={{
            ...sectionCard,
            ...(isMobile ? {
              display: 'flex',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              gap: '8px',
              padding: '12px',
            } : {}),
          }}>
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: isMobile ? 'auto' : '100%',
                  flexShrink: isMobile ? 0 : undefined,
                  background: activeSection === section.id
                    ? 'rgba(34,197,94,0.1)' : 'transparent',
                  border: 'none',
                  borderLeft: !isMobile && activeSection === section.id
                    ? '2px solid var(--accent)' : isMobile ? 'none' : '2px solid transparent',
                  borderBottom: isMobile && activeSection === section.id
                    ? '2px solid var(--accent)' : isMobile ? '2px solid transparent' : undefined,
                  color: activeSection === section.id ? 'var(--accent)' : 'var(--text-2)',
                  borderRadius: isMobile ? '8px' : '0 8px 8px 0',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: activeSection === section.id ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: isMobile ? 0 : '4px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                <span>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </div>

          {/* Widget preview */}
          <div style={{
            ...sectionCard,
            marginTop: '0',
            ...(isMobile ? { display: 'none' } : {}),
          }}>
            <p style={{
              color: 'var(--text-3)', fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              margin: '0 0 12px',
            }}>
              Aperçu widget
            </p>
            <div style={{
              background: config.secondaryColor || '#18181b',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #27272a',
            }}>
              <div style={{
                background: config.primaryColor,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '12px',
                }}>
                  {config.companyName?.charAt(0) || 'K'}
                </div>
                <div>
                  <p style={{ margin: 0, color: 'white', fontSize: '12px', fontWeight: 600 }}>
                    {config.welcomeName || config.companyName || 'Kadria'}
                  </p>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>
                    Assistant en ligne
                  </p>
                </div>
              </div>
              <div style={{ padding: '10px 14px' }}>
                <div style={{
                  background: '#27272a',
                  borderRadius: '4px 10px 10px 10px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: 'white',
                  lineHeight: 1.5,
                }}>
                  {config.welcomeMessage ||
                    'Bonjour ! Je vais vous aider à structurer votre projet. Pour commencer, quel type de travaux souhaitez-vous réaliser ?'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div>
          {/* Section Entreprise */}
          {activeSection === 'entreprise' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                🏢 Mon entreprise
              </h2>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Informations générales
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>Nom de l&apos;entreprise</label>
                      <input
                        value={config.companyName}
                        onChange={e => setConfig(c => ({ ...c, companyName: e.target.value }))}
                        placeholder="Martin Rénovation"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Métier principal</label>
                      <select
                        value={config.primaryTrade}
                        onChange={e => setConfig(c => ({ ...c, primaryTrade: e.target.value }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">Sélectionner un métier</option>
                        {TRADES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>URL du logo</label>
                    <input
                      value={config.logoUrl}
                      onChange={e => setConfig(c => ({ ...c, logoUrl: e.target.value }))}
                      placeholder="https://monsite.fr/logo.png"
                      style={inputStyle}
                    />
                    {config.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={config.logoUrl}
                        alt="Logo preview"
                        style={{
                          marginTop: '8px', height: '40px',
                          objectFit: 'contain', borderRadius: '6px',
                        }}
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Site web</label>
                    <input
                      value={config.websiteUrl}
                      onChange={e => setConfig(c => ({ ...c, websiteUrl: e.target.value }))}
                      placeholder="https://monsite.fr"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Horaires d&apos;ouverture
                </h3>
                <div>
                  <label style={labelStyle}>Horaires (affiché dans le widget)</label>
                  <textarea
                    value={config.hours}
                    onChange={e => setConfig(c => ({ ...c, hours: e.target.value }))}
                    placeholder={"Lun-Ven : 8h-18h\nSam : 9h-12h"}
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      lineHeight: 1.6,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section Widget */}
          {activeSection === 'widget' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                🎨 Mon widget
              </h2>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Couleurs
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Couleur principale</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={e => setConfig(c => ({ ...c, primaryColor: e.target.value }))}
                        style={{
                          width: '48px', height: '44px',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          background: 'transparent', cursor: 'pointer',
                          padding: '2px',
                        }}
                      />
                      <input
                        value={config.primaryColor}
                        onChange={e => setConfig(c => ({ ...c, primaryColor: e.target.value }))}
                        placeholder="#22c55e"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                      Couleur du header et des boutons CTA
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Couleur secondaire</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={config.secondaryColor}
                        onChange={e => setConfig(c => ({ ...c, secondaryColor: e.target.value }))}
                        style={{
                          width: '48px', height: '44px',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          background: 'transparent', cursor: 'pointer',
                          padding: '2px',
                        }}
                      />
                      <input
                        value={config.secondaryColor}
                        onChange={e => setConfig(c => ({ ...c, secondaryColor: e.target.value }))}
                        placeholder="var(--bg-elevated)"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                      Fond du widget
                    </p>
                  </div>
                </div>

                {/* Palette de couleurs suggestions */}
                <div style={{ marginTop: '16px' }}>
                  <p style={{ ...labelStyle, marginBottom: '8px' }}>Palettes suggérées</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { name: 'Kadria', primary: '#22c55e', secondary: 'var(--bg)' },
                      { name: 'Océan', primary: '#3b82f6', secondary: '#0f172a' },
                      { name: 'Ardoise', primary: '#64748b', secondary: '#0f172a' },
                      { name: 'Terracotta', primary: '#ea580c', secondary: '#1c0a00' },
                      { name: 'Violet', primary: '#8b5cf6', secondary: '#0f0a1e' },
                      { name: 'Or', primary: '#d97706', secondary: '#1c1000' },
                    ].map(palette => (
                      <button
                        key={palette.name}
                        onClick={() => setConfig(c => ({
                          ...c,
                          primaryColor: palette.primary,
                          secondaryColor: palette.secondary,
                        }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'var(--bg-hover)', border: '1px solid var(--border)',
                          borderRadius: '8px', padding: '6px 12px',
                          cursor: 'pointer', color: 'var(--text-1)', fontSize: '12px',
                        }}
                      >
                        <div style={{
                          width: '14px', height: '14px', borderRadius: '50%',
                          background: palette.primary,
                        }} />
                        {palette.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Message d&apos;accueil
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Personnalise le premier message affiché au prospect.
                  Le moteur de qualification Kadria reste identique.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Nom affiché dans le widget</label>
                    <input
                      value={config.welcomeName}
                      onChange={e => setConfig(c => ({ ...c, welcomeName: e.target.value }))}
                      placeholder="Assistant Martin Rénovation"
                      style={inputStyle}
                    />
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '5px 0 0' }}>
                      Affiché dans le header du widget à la place de &quot;Kadria&quot;
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Message d&apos;accueil personnalisé</label>
                    <textarea
                      value={config.welcomeMessage}
                      onChange={e => setConfig(c => ({ ...c, welcomeMessage: e.target.value }))}
                      placeholder="Bonjour ! Je suis l'assistant de Martin Rénovation. Je vais vous aider à préparer votre projet. Pour commencer, quel type de travaux souhaitez-vous réaliser ?"
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    />
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '5px 0 0' }}>
                      Si vide, le message Kadria par défaut est utilisé.
                    </p>
                  </div>
                </div>
              </div>

              {/* Code d'intégration */}
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Intégration sur votre site
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 14px' }}>
                  Copiez ce code et collez-le sur votre site
                  pour afficher le widget Kadria.
                </p>
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                  position: 'relative',
                }}>
                  <pre style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#4ade80',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    lineHeight: 1.6,
                  }}>
                    {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadria-beta.vercel.app'}/widget.js" data-artisan-id="${artisanIdDisplay}"></script>`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadria-beta.vercel.app'}/widget.js" data-artisan-id="${artisanIdDisplay}"></script>`
                      )
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: copied ? 'rgba(34,197,94,0.2)' : 'var(--bg-hover)',
                      border: '1px solid',
                      borderColor: copied ? 'var(--accent)' : 'var(--border)',
                      color: copied ? '#4ade80' : 'var(--text-2)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? '✓ Copié !' : 'Copier'}
                  </button>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '8px 0 0' }}>
                  Collez ce code avant la balise &lt;/body&gt; de votre site.
                  Le widget apparaît automatiquement aux couleurs de votre entreprise.
                </p>
              </div>
            </div>
          )}

          {/* Section Contact */}
          {activeSection === 'contact' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                📍 Coordonnées
              </h2>
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Informations de contact
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Téléphone professionnel</label>
                    <input
                      type="tel"
                      value={config.phone}
                      onChange={e => setConfig(c => ({ ...c, phone: e.target.value }))}
                      placeholder="06 12 34 56 78"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Adresse professionnelle</label>
                    <input
                      value={config.address}
                      onChange={e => setConfig(c => ({ ...c, address: e.target.value }))}
                      placeholder="12 rue de la Paix, 75001 Paris"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Infos légales */}
          {activeSection === 'legal' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                📋 Informations légales
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '-12px 0 16px' }}>
                Ces informations apparaissent sur vos devis et documents officiels.
              </p>

              {/* Groupe 1 — Identité professionnelle */}
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Identité professionnelle
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Raison sociale / Nom complet *</label>
                    <input
                      value={config.raisonSociale}
                      onChange={e => setConfig(c => ({ ...c, raisonSociale: e.target.value }))}
                      placeholder="Martin Rénovation SARL"
                      style={inputStyle}
                    />
                    {legalErrors.raisonSociale && <p style={errorStyle}>{legalErrors.raisonSociale}</p>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>Forme juridique *</label>
                      <select
                        value={config.formeJuridique}
                        onChange={e => setConfig(c => ({ ...c, formeJuridique: e.target.value }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">Sélectionner</option>
                        {FORMES_JURIDIQUES.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      {legalErrors.formeJuridique && <p style={errorStyle}>{legalErrors.formeJuridique}</p>}
                    </div>

                    <div>
                      <label style={labelStyle}>SIRET *</label>
                      <input
                        value={config.siret}
                        onChange={e => setConfig(c => ({ ...c, siret: e.target.value.replace(/[^\d]/g, '') }))}
                        placeholder="12345678901234"
                        maxLength={14}
                        inputMode="numeric"
                        style={inputStyle}
                      />
                      {legalErrors.siret && <p style={errorStyle}>{legalErrors.siret}</p>}
                    </div>
                  </div>

                  <div>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={!config.tvaAssujetti}
                        onChange={e => setConfig(c => ({ ...c, tvaAssujetti: !e.target.checked }))}
                      />
                      Je ne suis pas assujetti à la TVA
                    </label>
                  </div>

                  {config.tvaAssujetti && (
                    <div>
                      <label style={labelStyle}>Numéro de TVA intracommunautaire</label>
                      <input
                        value={config.tvaNumber}
                        onChange={e => setConfig(c => ({ ...c, tvaNumber: e.target.value }))}
                        placeholder="FR12345678901"
                        style={inputStyle}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Groupe 2 — Adresse professionnelle */}
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Adresse professionnelle
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Adresse *</label>
                    <input
                      value={config.adressePro}
                      onChange={e => setConfig(c => ({ ...c, adressePro: e.target.value }))}
                      placeholder="12 rue de la Paix"
                      style={inputStyle}
                    />
                    {legalErrors.adressePro && <p style={errorStyle}>{legalErrors.adressePro}</p>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>Code postal *</label>
                      <input
                        value={config.cpPro}
                        onChange={e => setConfig(c => ({ ...c, cpPro: e.target.value }))}
                        placeholder="75001"
                        style={inputStyle}
                      />
                      {legalErrors.cpPro && <p style={errorStyle}>{legalErrors.cpPro}</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>Ville *</label>
                      <input
                        value={config.villePro}
                        onChange={e => setConfig(c => ({ ...c, villePro: e.target.value }))}
                        placeholder="Paris"
                        style={inputStyle}
                      />
                      {legalErrors.villePro && <p style={errorStyle}>{legalErrors.villePro}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Groupe 3 — Assurance */}
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Assurance
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={config.assuranceNonRequise}
                        onChange={e => setConfig(c => ({ ...c, assuranceNonRequise: e.target.checked }))}
                      />
                      Mon métier ne requiert pas d&apos;assurance décennale
                    </label>
                  </div>

                  {!config.assuranceNonRequise && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={labelStyle}>Nom de l&apos;assureur *</label>
                        <input
                          value={config.assureur}
                          onChange={e => setConfig(c => ({ ...c, assureur: e.target.value }))}
                          placeholder="AXA, MAAF, ..."
                          style={inputStyle}
                        />
                        {legalErrors.assureur && <p style={errorStyle}>{legalErrors.assureur}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>N° police d&apos;assurance décennale *</label>
                        <input
                          value={config.numAssurance}
                          onChange={e => setConfig(c => ({ ...c, numAssurance: e.target.value }))}
                          placeholder="123456789"
                          style={inputStyle}
                        />
                        {legalErrors.numAssurance && <p style={errorStyle}>{legalErrors.numAssurance}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Groupe 4 — Préférences devis */}
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Préférences devis
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>Préfixe numérotation</label>
                      <input
                        value={config.devisPrefixe}
                        onChange={e => setConfig(c => ({ ...c, devisPrefixe: e.target.value.toUpperCase().slice(0, 6) }))}
                        placeholder="DEV"
                        maxLength={6}
                        style={inputStyle}
                      />
                      {legalErrors.devisPrefixe && <p style={errorStyle}>{legalErrors.devisPrefixe}</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>Délai de validité par défaut</label>
                      <select
                        value={config.devisValidite}
                        onChange={e => setConfig(c => ({ ...c, devisValidite: Number(e.target.value) }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {DEVIS_VALIDITES.map(v => (
                          <option key={v} value={v}>{v} jours</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Taux TVA par défaut</label>
                      <select
                        value={config.devisTvaDefaut}
                        onChange={e => setConfig(c => ({ ...c, devisTvaDefaut: Number(e.target.value) }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {DEVIS_TVA_TAUX.map(t => (
                          <option key={t} value={t}>{t}%</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Conditions de paiement par défaut</label>
                    <textarea
                      value={config.devisConditionsPaiement}
                      onChange={e => setConfig(c => ({ ...c, devisConditionsPaiement: e.target.value }))}
                      placeholder="30% à la commande, solde à la livraison"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Mention légale personnalisée</label>
                    <textarea
                      value={config.devisMentionLegale}
                      onChange={e => setConfig(c => ({ ...c, devisMentionLegale: e.target.value }))}
                      placeholder="Artisan RGE certifié"
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'apparence' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                🌓 Apparence
              </h2>
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Thème du dashboard
                </h3>
                <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 20px' }}>
                  Choisissez l'apparence de votre espace de travail Kadria.
                  Ce réglage n'affecte que votre dashboard, pas le widget
                  visible par vos prospects.
                </p>
                <div style={{ display: 'flex', gap: '14px' }}>
                  {[
                    { value: 'dark', label: 'Sombre', icon: '🌙',
                      preview: { bg: '#09090b', card: '#18181b', text: '#f4f4f5' } },
                    { value: 'light', label: 'Clair', icon: '☀️',
                      preview: { bg: '#fafafa', card: '#ffffff', text: '#18181b' } },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value as 'dark' | 'light')}
                      style={{
                        flex: 1,
                        background: opt.preview.bg,
                        border: theme === opt.value
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border)',
                        borderRadius: '14px',
                        padding: '20px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <div style={{
                        background: opt.preview.card,
                        border: '1px solid rgba(128,128,128,0.15)',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: '12px',
                      }}>
                        <div style={{
                          width: '60%', height: '8px',
                          background: opt.preview.text,
                          opacity: 0.8, borderRadius: '4px',
                          marginBottom: '6px',
                        }} />
                        <div style={{
                          width: '40%', height: '8px',
                          background: opt.preview.text,
                          opacity: 0.4, borderRadius: '4px',
                        }} />
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span>{opt.icon}</span>
                        <span style={{ color: opt.preview.text, fontWeight: 600, fontSize: '14px' }}>
                          {opt.label}
                        </span>
                        {theme === opt.value && (
                          <span style={{
                            marginLeft: 'auto', color: 'var(--accent)', fontSize: '12px',
                          }}>
                            ✓ Actif
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
