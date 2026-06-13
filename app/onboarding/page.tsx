'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const TRADES = [
  'Plombier', 'Électricien', 'Maçon', 'Peintre', 'Menuisier',
  'Couvreur', 'Carreleur', 'Chauffagiste', 'Paysagiste',
  'Pisciniste', 'Rénovation globale', 'Autre',
]

const SECTIONS = [
  { id: 'entreprise', label: 'Mon entreprise', icon: '🏢' },
  { id: 'widget', label: 'Mon widget', icon: '🎨' },
  { id: 'contact', label: 'Coordonnées', icon: '📍' },
]

export default function OnboardingPage() {
  const router = useRouter()
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
    secondaryColor: '#18181b',
    websiteUrl: '',
  })

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
            secondaryColor: data.config.secondaryColor || '#18181b',
            websiteUrl: data.config.websiteUrl || '',
          })
          if (data.config.artisanId) {
            setArtisanIdDisplay(data.config.artisanId)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])


  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'system-ui',
  }

  const labelStyle: React.CSSProperties = {
    color: '#a1a1aa',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  }

  const sectionCard: React.CSSProperties = {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#09090b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#a1a1aa', fontFamily: 'system-ui',
    }}>
      Chargement...
    </div>
  )

  return (
    <main style={{
      minHeight: '100vh',
      background: '#09090b',
      fontFamily: 'system-ui, sans-serif',
      color: 'white',
    }}>
      {/* Header */}
      <div style={{
        background: '#18181b',
        borderBottom: '1px solid #27272a',
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
              color: '#a1a1aa', cursor: 'pointer', fontSize: '14px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            ← Retour
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              <span style={{ color: '#22c55e' }}>K</span>adria
              <span style={{ color: '#71717a', fontWeight: 400, fontSize: '14px', marginLeft: '8px' }}>
                · Configuration
              </span>
            </h1>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: saved ? 'rgba(34,197,94,0.2)' : saving ? '#27272a' : '#22c55e',
            border: saved ? '1px solid #22c55e' : 'none',
            color: saved ? '#4ade80' : saving ? '#71717a' : 'black',
            fontWeight: 700, borderRadius: '10px',
            padding: '10px 24px', fontSize: '14px',
            cursor: saving ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saved ? '✓ Sauvegardé' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

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
                    ? '2px solid #22c55e' : isMobile ? 'none' : '2px solid transparent',
                  borderBottom: isMobile && activeSection === section.id
                    ? '2px solid #22c55e' : isMobile ? '2px solid transparent' : undefined,
                  color: activeSection === section.id ? '#22c55e' : '#a1a1aa',
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
              color: '#71717a', fontSize: '11px', fontWeight: 600,
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
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#22c55e' }}>
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
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#22c55e' }}>
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
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#22c55e' }}>
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
                          borderRadius: '8px', border: '1px solid #3f3f46',
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
                    <p style={{ color: '#71717a', fontSize: '12px', margin: '6px 0 0' }}>
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
                          borderRadius: '8px', border: '1px solid #3f3f46',
                          background: 'transparent', cursor: 'pointer',
                          padding: '2px',
                        }}
                      />
                      <input
                        value={config.secondaryColor}
                        onChange={e => setConfig(c => ({ ...c, secondaryColor: e.target.value }))}
                        placeholder="#18181b"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    <p style={{ color: '#71717a', fontSize: '12px', margin: '6px 0 0' }}>
                      Fond du widget
                    </p>
                  </div>
                </div>

                {/* Palette de couleurs suggestions */}
                <div style={{ marginTop: '16px' }}>
                  <p style={{ ...labelStyle, marginBottom: '8px' }}>Palettes suggérées</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { name: 'Kadria', primary: '#22c55e', secondary: '#09090b' },
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
                          background: '#27272a', border: '1px solid #3f3f46',
                          borderRadius: '8px', padding: '6px 12px',
                          cursor: 'pointer', color: 'white', fontSize: '12px',
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
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#22c55e' }}>
                  Message d&apos;accueil
                </h3>
                <p style={{ color: '#71717a', fontSize: '13px', margin: '0 0 16px' }}>
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
                    <p style={{ color: '#71717a', fontSize: '12px', margin: '5px 0 0' }}>
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
                    <p style={{ color: '#71717a', fontSize: '12px', margin: '5px 0 0' }}>
                      Si vide, le message Kadria par défaut est utilisé.
                    </p>
                  </div>
                </div>
              </div>

              {/* Code d'intégration */}
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#22c55e' }}>
                  Intégration sur votre site
                </h3>
                <p style={{ color: '#71717a', fontSize: '13px', margin: '0 0 14px' }}>
                  Copiez ce code et collez-le sur votre site
                  pour afficher le widget Kadria.
                </p>
                <div style={{
                  background: '#09090b',
                  border: '1px solid #27272a',
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
                      background: copied ? 'rgba(34,197,94,0.2)' : '#27272a',
                      border: '1px solid',
                      borderColor: copied ? '#22c55e' : '#3f3f46',
                      color: copied ? '#4ade80' : '#a1a1aa',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? '✓ Copié !' : 'Copier'}
                  </button>
                </div>
                <p style={{ color: '#52525b', fontSize: '12px', margin: '8px 0 0' }}>
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
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#22c55e' }}>
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
        </div>
      </div>
    </main>
  )
}
