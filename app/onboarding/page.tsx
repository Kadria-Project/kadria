'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { ARTISAN_TRADES } from '@/src/config/trades'
import {
  VehicleType,
  ChargingType,
  VEHICLE_TYPE_LABELS,
  CHARGING_TYPE_LABELS,
  DEFAULT_CONSUMPTION_PER_100KM,
} from '@/src/config/travel'

const FORMES_JURIDIQUES = [
  'Auto-entrepreneur', 'EI', 'EURL', 'SARL', 'SAS', 'SASU', 'Autre',
]

const DEVIS_VALIDITES = [30, 60, 90]
const DEVIS_TVA_TAUX = [5.5, 10, 20]

const STEPS = [
  { id: 'bienvenue', label: 'Bienvenue', icon: '👋' },
  { id: 'entreprise', label: 'Entreprise', icon: '🏢' },
  { id: 'metier', label: 'Métier & zone', icon: '🛠️' },
  { id: 'vehicule', label: 'Véhicule', icon: '🚗' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'devis', label: 'Devis', icon: '📋' },
  { id: 'widget', label: 'Widget', icon: '🎨' },
  { id: 'fin', label: 'Finalisation', icon: '✅' },
] as const

type StepId = typeof STEPS[number]['id']

const SERVICE_AREA_FLEXIBLE = 'SELON_OPPORTUNITE'

interface OnboardingConfig {
  companyName: string
  primaryTrade: string
  trades: string[]
  otherTrade: string
  phone: string
  address: string
  hours: string
  websiteUrl: string
  raisonSociale: string
  formeJuridique: string
  siret: string
  adressePro: string
  cpPro: string
  villePro: string
  serviceArea: string
  interventionRadius: number | ''
  notificationEmail: string
  devisPrefixe: string
  devisValidite: number
  devisTvaDefaut: number
  devisConditionsPaiement: string
  primaryColor: string
  secondaryColor: string
  welcomeName: string
  welcomeMessage: string
  travelConfig: {
    vehicleType: VehicleType | ''
    consumptionPer100Km: number | undefined
    chargingType: ChargingType
    originAddress: string | undefined
    originLat: number | undefined
    originLng: number | undefined
    minimumTravelFee: number | undefined
    freeTravelRadiusKm: number | undefined
  }
}

const EMPTY_CONFIG: OnboardingConfig = {
  companyName: '',
  primaryTrade: '',
  trades: [],
  otherTrade: '',
  phone: '',
  address: '',
  hours: '',
  websiteUrl: '',
  raisonSociale: '',
  formeJuridique: '',
  siret: '',
  adressePro: '',
  cpPro: '',
  villePro: '',
  serviceArea: '',
  interventionRadius: '',
  notificationEmail: '',
  devisPrefixe: 'DEV',
  devisValidite: 90,
  devisTvaDefaut: 10,
  devisConditionsPaiement: '',
  primaryColor: '#22c55e',
  secondaryColor: '#18181b',
  welcomeName: '',
  welcomeMessage: '',
  travelConfig: {
    vehicleType: '',
    consumptionPer100Km: undefined,
    chargingType: 'maison',
    originAddress: undefined,
    originLat: undefined,
    originLng: undefined,
    minimumTravelFee: 25,
    freeTravelRadiusKm: 10,
  },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [config, setConfig] = useState<OnboardingConfig>(EMPTY_CONFIG)
  const [artisanIdDisplay, setArtisanIdDisplay] = useState('VOTRE_ARTISAN_ID')
  const [copied, setCopied] = useState(false)

  const [isMobile, setIsMobile] = useState(false)
  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/artisan/config')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.config) {
          const c = data.config
          const knownValues = new Set(ARTISAN_TRADES.map(t => t.value))
          const rawTrades: string[] = Array.isArray(c.trades) ? c.trades : []
          const customTrade = rawTrades.find(t => !knownValues.has(t)) || ''
          setConfig({
            companyName: c.companyName || '',
            primaryTrade: c.primaryTrade || '',
            trades: rawTrades,
            otherTrade: customTrade,
            phone: c.phone || '',
            address: c.address || '',
            hours: c.hours || '',
            websiteUrl: c.websiteUrl || '',
            raisonSociale: c.raisonSociale || '',
            formeJuridique: c.formeJuridique || '',
            siret: c.siret || '',
            adressePro: c.adressePro || '',
            cpPro: c.cpPro || '',
            villePro: c.villePro || '',
            serviceArea: c.serviceArea || '',
            interventionRadius: c.interventionRadius || '',
            notificationEmail: c.notificationEmail || '',
            devisPrefixe: c.devisPrefixe || 'DEV',
            devisValidite: c.devisValidite || 90,
            devisTvaDefaut: c.devisTvaDefaut || 10,
            devisConditionsPaiement: c.devisConditionsPaiement || '',
            primaryColor: c.primaryColor || '#22c55e',
            secondaryColor: c.secondaryColor || '#18181b',
            welcomeName: c.welcomeName || '',
            welcomeMessage: c.welcomeMessage || '',
            travelConfig: {
              vehicleType: (c.travelConfig?.vehicleType || '') as VehicleType | '',
              consumptionPer100Km: c.travelConfig?.consumptionPer100Km,
              chargingType: (c.travelConfig?.chargingType || 'maison') as ChargingType,
              originAddress: c.travelConfig?.originAddress || c.address || undefined,
              originLat: c.travelConfig?.originLat,
              originLng: c.travelConfig?.originLng,
              minimumTravelFee: c.travelConfig?.minimumTravelFee ?? 25,
              freeTravelRadiusKm: c.travelConfig?.freeTravelRadiusKm ?? 10,
            },
          })
          if (c.artisanId) setArtisanIdDisplay(c.artisanId)
          if (c.onboardingCompleted) {
            router.replace('/dashboard-v2')
          }
        }
      })
      .finally(() => setLoading(false))
  }, [router])

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
    padding: isMobile ? '16px' : '24px',
    marginBottom: '16px',
    minWidth: 0,
  }

  const step = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  // Champs obligatoires minimaux par étape pour avancer (non bloquant pour le reste).
  function getStepErrors(id: StepId): string {
    if (id === 'entreprise') {
      if (!config.companyName.trim()) return "Le nom de l'entreprise est requis pour continuer."
    }
    if (id === 'metier') {
      if (config.trades.length === 0) return 'Sélectionnez au moins un métier pour continuer.'
      if (config.trades.includes('autre') && !config.otherTrade.trim()) {
        return 'Précisez votre métier dans le champ "Autre".'
      }
    }
    return ''
  }

  async function persistStep(): Promise<boolean> {
    setSaving(true)
    setSaveError('')
    try {
      const effectiveTrades = config.trades.map(t =>
        t === 'autre' && config.otherTrade.trim() ? config.otherTrade.trim() : t
      )
      const res = await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          trades: effectiveTrades,
          interventionRadius: config.interventionRadius === '' ? undefined : Number(config.interventionRadius),
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur lors de la sauvegarde')
      setSavedAt(Date.now())
      return true
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
      return false
    } finally {
      setSaving(false)
    }
  }

  const [blockError, setBlockError] = useState('')

  async function goNext() {
    const err = getStepErrors(step.id)
    if (err) {
      setBlockError(err)
      return
    }
    setBlockError('')
    const ok = await persistStep()
    if (!ok) return
    if (isLast) return
    setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
  }

  function goPrev() {
    setBlockError('')
    setStepIndex(i => Math.max(i - 1, 0))
  }

  function skipForNow() {
    router.push('/dashboard-v2')
  }

  async function finalize() {
    setSaving(true)
    setSaveError('')
    try {
      const ok = await persistStep()
      if (!ok) return
      const res = await fetch('/api/onboarding/complete', { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur lors de la finalisation')
      router.push('/dashboard-v2?onboarding=done')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Erreur lors de la finalisation')
    } finally {
      setSaving(false)
    }
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

  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100)
  const widgetScriptTag = `<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadria-beta.vercel.app'}/widget.js" data-artisan-id="${artisanIdDisplay}"></script>`

  return (
    <main className="dashboard-shell w-full max-w-full overflow-x-hidden" style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'system-ui, sans-serif',
      color: 'var(--text-1)',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-8 sm:py-4" style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <KadriaLogo size="sm" theme="dark" noLink />
          {!isMobile && (
            <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '14px' }}>
              · Configuration initiale
            </span>
          )}
        </div>
        <button
          onClick={skipForNow}
          className="shrink-0"
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px',
          }}
        >
          Terminer plus tard
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: isMobile ? '12px 12px 0' : '16px 32px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>
            Étape {stepIndex + 1} / {STEPS.length} · {step.icon} {step.label}
          </span>
          <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{progressPct}%</span>
        </div>
        <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-full px-3 py-4 sm:px-6 sm:py-8" style={{ maxWidth: '720px' }}>
        {blockError && (
          <div style={{
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '10px', padding: '12px 16px', color: '#f87171', fontSize: '13px', marginBottom: '16px',
          }}>
            {blockError}
          </div>
        )}
        {saveError && (
          <div style={{
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '10px', padding: '12px 16px', color: '#f87171', fontSize: '13px', marginBottom: '16px',
          }}>
            {saveError}
          </div>
        )}

        {step.id === 'bienvenue' && (
          <div style={sectionCard}>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 700 }}>
              👋 Bienvenue sur Kadria
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              En quelques étapes, configurons votre espace : entreprise, métier, zone d&apos;intervention,
              notifications, devis et widget. Vous pourrez revenir modifier ces réglages
              à tout moment depuis votre dashboard.
            </p>
          </div>
        )}

        {step.id === 'entreprise' && (
          <div style={sectionCard}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>🏢 Votre entreprise</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nom de l&apos;entreprise *</label>
                <input
                  value={config.companyName}
                  onChange={e => setConfig(c => ({ ...c, companyName: e.target.value }))}
                  placeholder="Martin Rénovation"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Raison sociale</label>
                  <input
                    value={config.raisonSociale}
                    onChange={e => setConfig(c => ({ ...c, raisonSociale: e.target.value }))}
                    placeholder="Martin Rénovation SARL"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Forme juridique</label>
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
                </div>
              </div>
              <div>
                <label style={labelStyle}>SIRET</label>
                <input
                  value={config.siret}
                  onChange={e => setConfig(c => ({ ...c, siret: e.target.value.replace(/[^\d]/g, '') }))}
                  placeholder="12345678901234"
                  maxLength={14}
                  inputMode="numeric"
                  style={inputStyle}
                />
              </div>
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
                <AddressAutocomplete
                  value={config.adressePro}
                  onChange={value => setConfig(c => ({ ...c, adressePro: value }))}
                  onSelect={selection => setConfig(c => ({
                    ...c,
                    adressePro: selection.address,
                    cpPro: selection.postalCode || c.cpPro,
                    villePro: selection.city || c.villePro,
                    address: selection.address,
                    travelConfig: {
                      ...c.travelConfig,
                      originAddress: selection.address,
                      originLat: selection.latitude ?? c.travelConfig.originLat,
                      originLng: selection.longitude ?? c.travelConfig.originLng,
                    },
                  }))}
                  placeholder="12 rue de la Paix, 75001 Paris"
                  style={inputStyle}
                />
                <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: '6px 0 0' }}>
                  Sélectionnez une suggestion de l&apos;autocomplete pour permettre le calcul des frais de déplacement.
                </p>
              </div>
            </div>
          </div>
        )}

        {step.id === 'metier' && (
          <div style={sectionCard}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>🛠️ Quels métiers couvrez-vous ?</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 4px' }}>
              Sélectionnez un ou plusieurs métiers. Kadria s&apos;en servira pour mieux qualifier vos prospects.
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 16px', fontStyle: 'italic' }}>
              Exemple : Plombier + Chauffagiste, ou Paysagiste + Terrassier.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Métiers *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ARTISAN_TRADES.map(t => {
                    const selected = config.trades.includes(t.value)
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setConfig(c => {
                          const trades = selected
                            ? c.trades.filter(v => v !== t.value)
                            : [...c.trades, t.value]
                          return {
                            ...c,
                            trades,
                            primaryTrade: trades[0]
                              ? (ARTISAN_TRADES.find(opt => opt.value === trades[0])?.label || trades[0])
                              : '',
                            otherTrade: t.value === 'autre' && selected ? '' : c.otherTrade,
                          }
                        })}
                        style={{
                          background: selected ? 'rgba(34,197,94,0.15)' : 'var(--bg-hover)',
                          border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          color: selected ? 'var(--accent)' : 'var(--text-2)',
                          borderRadius: '20px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: selected ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {selected ? '✓ ' : ''}{t.label}
                      </button>
                    )
                  })}
                </div>
                {config.trades.length === 0 && (
                  <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '8px 0 0' }}>
                    Sélectionnez au moins un métier.
                  </p>
                )}
              </div>
              {config.trades.includes('autre') && (
                <div>
                  <label style={labelStyle}>Précisez votre métier</label>
                  <input
                    value={config.otherTrade}
                    onChange={e => setConfig(c => ({ ...c, otherTrade: e.target.value }))}
                    placeholder="Ex : Ramoneur"
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <label style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    checked={config.serviceArea === SERVICE_AREA_FLEXIBLE}
                    onChange={e => setConfig(c => ({
                      ...c,
                      serviceArea: e.target.checked ? SERVICE_AREA_FLEXIBLE : '',
                    }))}
                  />
                  Je me déplace selon opportunité (pas de zone fixe)
                </label>
              </div>
              {config.serviceArea !== SERVICE_AREA_FLEXIBLE && (
                <div>
                  <label style={labelStyle}>Zone d&apos;intervention (villes / secteur)</label>
                  <input
                    value={config.serviceArea}
                    onChange={e => setConfig(c => ({ ...c, serviceArea: e.target.value }))}
                    placeholder="Paris et petite couronne"
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <label style={labelStyle}>Rayon d&apos;intervention (km)</label>
                <input
                  type="number"
                  min={0}
                  value={config.interventionRadius}
                  onChange={e => setConfig(c => ({ ...c, interventionRadius: e.target.value === '' ? '' : Number(e.target.value) }))}
                  placeholder="30"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}

        {step.id === 'vehicule' && (
          <div style={sectionCard}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>🚗 Véhicule & déplacements</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
              Permet d&apos;estimer le coût d&apos;un déplacement vers un chantier (fonctionnalité Performance).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Type de motorisation</label>
                <select
                  value={config.travelConfig.vehicleType}
                  onChange={e => {
                    const vehicleType = e.target.value as VehicleType
                    setConfig(c => ({
                      ...c,
                      travelConfig: {
                        ...c.travelConfig,
                        vehicleType,
                        consumptionPer100Km: DEFAULT_CONSUMPTION_PER_100KM[vehicleType],
                      },
                    }))
                  }}
                  style={inputStyle}
                >
                  <option value="">Sélectionner...</option>
                  {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map(type => (
                    <option key={type} value={type}>{VEHICLE_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </div>

              {config.travelConfig.vehicleType && (
                <div>
                  <label style={labelStyle}>
                    Consommation moyenne ({config.travelConfig.vehicleType === 'electrique' ? 'kWh/100km' : 'L/100km'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.travelConfig.consumptionPer100Km ?? ''}
                    onChange={e => setConfig(c => ({
                      ...c,
                      travelConfig: { ...c.travelConfig, consumptionPer100Km: e.target.value === '' ? undefined : Number(e.target.value) },
                    }))}
                    style={inputStyle}
                  />
                </div>
              )}

              {config.travelConfig.vehicleType === 'electrique' && (
                <div>
                  <label style={labelStyle}>Type de recharge principal</label>
                  <select
                    value={config.travelConfig.chargingType}
                    onChange={e => setConfig(c => ({
                      ...c,
                      travelConfig: { ...c.travelConfig, chargingType: e.target.value as ChargingType },
                    }))}
                    style={inputStyle}
                  >
                    {(Object.keys(CHARGING_TYPE_LABELS) as ChargingType[]).map(type => (
                      <option key={type} value={type}>{CHARGING_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={labelStyle}>Frais minimum (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="25"
                    value={config.travelConfig.minimumTravelFee ?? ''}
                    onChange={e => setConfig(c => ({
                      ...c,
                      travelConfig: { ...c.travelConfig, minimumTravelFee: e.target.value === '' ? undefined : Number(e.target.value) },
                    }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={labelStyle}>Zone sans frais (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="10"
                    value={config.travelConfig.freeTravelRadiusKm ?? ''}
                    onChange={e => setConfig(c => ({
                      ...c,
                      travelConfig: { ...c.travelConfig, freeTravelRadiusKm: e.target.value === '' ? undefined : Number(e.target.value) },
                    }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: 0 }}>
                Vous pourrez modifier ces valeurs plus tard dans Paramètres.
              </p>
            </div>
          </div>
        )}

        {step.id === 'notifications' && (
          <div style={sectionCard}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>🔔 Notifications</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
              Kadria vous envoie un email à chaque nouveau dossier qualifié et à chaque évènement important
              sur vos devis. Indiquez l&apos;adresse email à utiliser pour ces alertes.
            </p>
            <div>
              <label style={labelStyle}>Email de notification</label>
              <input
                type="email"
                value={config.notificationEmail}
                onChange={e => setConfig(c => ({ ...c, notificationEmail: e.target.value }))}
                placeholder="contact@monentreprise.fr"
                style={inputStyle}
              />
              <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                Si laissé vide, l&apos;email de votre compte sera utilisé.
              </p>
            </div>
          </div>
        )}

        {step.id === 'devis' && (
          <div style={sectionCard}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📋 Préférences devis</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Préfixe numérotation</label>
                  <input
                    value={config.devisPrefixe}
                    onChange={e => setConfig(c => ({ ...c, devisPrefixe: e.target.value.toUpperCase().slice(0, 6) }))}
                    placeholder="DEV"
                    maxLength={6}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Validité par défaut</label>
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
            </div>
          </div>
        )}

        {step.id === 'widget' && (
          <div style={sectionCard}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>🎨 Widget pour votre site</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 14px' }}>
              Copiez ce code et collez-le sur votre site pour afficher le widget Kadria.
            </p>
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '16px', position: 'relative', marginBottom: '14px',
            }}>
              <pre style={{
                margin: 0, fontFamily: 'monospace', fontSize: '13px', color: '#4ade80',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6,
              }}>
                {widgetScriptTag}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(widgetScriptTag)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: copied ? 'rgba(34,197,94,0.2)' : 'var(--bg-hover)',
                  border: '1px solid', borderColor: copied ? 'var(--accent)' : 'var(--border)',
                  color: copied ? '#4ade80' : 'var(--text-2)', borderRadius: '6px',
                  padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
                }}
              >
                {copied ? '✓ Copié !' : 'Copier'}
              </button>
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 16px' }}>
              Collez ce code avant la balise &lt;/body&gt; de votre site.
            </p>
            <div style={{
              background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '14px',
            }}>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                Pas de site internet ? Kadria propose un site vitrine en option :
                <strong> 300€ en un seul versement</strong> ou <strong>50€/mois pendant 6 mois</strong>.
                Contactez-nous pour en savoir plus.
              </p>
            </div>
          </div>
        )}

        {step.id === 'fin' && (
          <div style={sectionCard}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>✅ Tout est prêt</h3>
            <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Entreprise', done: !!config.companyName },
                { label: 'Métier & zone d\'intervention', done: config.trades.length > 0 },
                { label: 'Notifications', done: !!config.notificationEmail },
                { label: 'Préférences devis', done: !!config.devisPrefixe },
                { label: 'Widget', done: true },
              ].map(item => (
                <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-2)', fontSize: '13px' }}>
                  <span style={{ color: item.done ? '#4ade80' : 'var(--text-3)' }}>
                    {item.done ? '✓' : '○'}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 16px' }}>
              Vous pourrez modifier tous ces réglages plus tard depuis votre dashboard.
            </p>
            <button
              onClick={finalize}
              disabled={saving}
              style={{
                background: 'var(--accent)', border: 'none', color: 'black', fontWeight: 700,
                borderRadius: '10px', padding: '12px 24px', fontSize: '14px',
                cursor: saving ? 'default' : 'pointer', width: '100%',
              }}
            >
              {saving ? 'Finalisation...' : 'Accéder à mon dashboard'}
            </button>
          </div>
        )}

        {/* Navigation */}
        {step.id !== 'fin' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '8px' }}>
            <button
              onClick={goPrev}
              disabled={isFirst}
              style={{
                background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)',
                borderRadius: '10px', padding: '10px 20px', fontSize: '14px',
                cursor: isFirst ? 'default' : 'pointer', opacity: isFirst ? 0.4 : 1,
              }}
            >
              ← Précédent
            </button>
            <button
              onClick={goNext}
              disabled={saving}
              style={{
                background: 'var(--accent)', border: 'none', color: 'black', fontWeight: 700,
                borderRadius: '10px', padding: '10px 24px', fontSize: '14px',
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Sauvegarde...' : 'Suivant →'}
            </button>
          </div>
        )}
        {savedAt && (
          <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '10px 0 0', textAlign: 'right' }}>
            ✓ Sauvegardé
          </p>
        )}
      </div>
    </main>
  )
}
