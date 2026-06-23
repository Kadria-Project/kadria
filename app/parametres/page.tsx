'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import { useTheme } from '@/src/hooks/useTheme'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { ARTISAN_TRADES } from '@/src/config/trades'
import { getSuggestedWorkTypesForTrades, getQuoteItemsForTrades } from '@/src/config/trade-taxonomy'
import type { ArtisanServiceCatalogItem, ArtisanQuoteTemplate, ArtisanQuoteTemplateLine } from '@/src/lib/quote-suggestions'
import {
  VehicleType,
  ChargingType,
  VEHICLE_TYPE_LABELS,
  CHARGING_TYPE_LABELS,
  DEFAULT_CONSUMPTION_PER_100KM,
} from '@/src/config/travel'

const SECTIONS = [
  { id: 'entreprise', label: 'Mon entreprise', icon: '🏢' },
  { id: 'widget', label: 'Mon widget', icon: '🎨' },
  { id: 'contact', label: 'Coordonnées', icon: '📍' },
  { id: 'legal', label: 'Infos légales', icon: '📋' },
  { id: 'vehicule', label: 'Véhicule & déplacements', icon: '🚗' },
  { id: 'apparence', label: 'Apparence', icon: '🌓' },
  { id: 'offre', label: 'Offre & quotas', icon: '💳' },
]

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
}

const USAGE_STATUS_LABELS: Record<UsageStatus, string> = {
  ok: 'OK',
  warning: 'Proche limite',
  limit_reached: 'Limite atteinte',
  exceeded: 'Dépassé',
}

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  essai: 'Essai',
  trial: 'Essai',
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

export default function ParametresPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [activeSection, setActiveSection] = useState('entreprise')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    primaryTrade: '',
    trades: [] as string[],
    otherTrade: '',
    serviceArea: '',
    interventionRadius: 0,
    notificationEmail: '',
    phone: '',
    address: '',
    hours: '',
    logoUrl: '',
    welcomeName: '',
    welcomeMessage: '',
    primaryColor: '#22c55e',
    secondaryColor: '#18181b',
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
    travelConfig: {
      vehicleType: '' as VehicleType | '',
      consumptionPer100Km: undefined as number | undefined,
      chargingType: 'maison' as ChargingType,
      originAddress: undefined as string | undefined,
      originLat: undefined as number | undefined,
      originLng: undefined as number | undefined,
      minimumTravelFee: undefined as number | undefined,
      freeTravelRadiusKm: undefined as number | undefined,
    },
    businessConfig: {
      acceptedWorkTypes: [] as string[],
      refusedWorkTypes: [] as string[],
      customAcceptedWork: '' as string,
      customRefusedWork: '' as string,
      serviceCatalog: [] as ArtisanServiceCatalogItem[],
      quoteTemplates: [] as ArtisanQuoteTemplate[],
    },
  })

  const [legalErrors, setLegalErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')

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
          const knownValues = new Set(ARTISAN_TRADES.map(t => t.value))
          const rawTrades: string[] = Array.isArray(data.config.trades) ? data.config.trades : []
          const customTrade = rawTrades.find((t: string) => !knownValues.has(t)) || ''
          setConfig({
            companyName: data.config.companyName || '',
            firstName: data.config.firstName || '',
            lastName: data.config.lastName || '',
            email: data.config.email || '',
            primaryTrade: data.config.primaryTrade || '',
            trades: rawTrades,
            otherTrade: customTrade,
            serviceArea: data.config.serviceArea || '',
            interventionRadius: data.config.interventionRadius || 0,
            notificationEmail: data.config.notificationEmail || '',
            phone: data.config.phone || '',
            address: data.config.address || '',
            hours: data.config.hours || '',
            logoUrl: data.config.logoUrl || '',
            welcomeName: data.config.welcomeName || '',
            welcomeMessage: data.config.welcomeMessage || '',
            primaryColor: data.config.primaryColor || '#22c55e',
            secondaryColor: data.config.secondaryColor || '#18181b',
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
            travelConfig: {
              vehicleType: (data.config.travelConfig?.vehicleType || '') as VehicleType | '',
              consumptionPer100Km: data.config.travelConfig?.consumptionPer100Km,
              chargingType: (data.config.travelConfig?.chargingType || 'maison') as ChargingType,
              originAddress: data.config.travelConfig?.originAddress || data.config.address || undefined,
              originLat: data.config.travelConfig?.originLat,
              originLng: data.config.travelConfig?.originLng,
              minimumTravelFee: data.config.travelConfig?.minimumTravelFee,
              freeTravelRadiusKm: data.config.travelConfig?.freeTravelRadiusKm,
            },
            businessConfig: {
              acceptedWorkTypes: Array.isArray(data.config.businessConfig?.acceptedWorkTypes) ? data.config.businessConfig.acceptedWorkTypes : [],
              refusedWorkTypes: Array.isArray(data.config.businessConfig?.refusedWorkTypes) ? data.config.businessConfig.refusedWorkTypes : [],
              customAcceptedWork: data.config.businessConfig?.customAcceptedWork || '',
              customRefusedWork: data.config.businessConfig?.customRefusedWork || '',
              serviceCatalog: Array.isArray(data.config.businessConfig?.serviceCatalog) ? data.config.businessConfig.serviceCatalog : [],
              quoteTemplates: Array.isArray(data.config.businessConfig?.quoteTemplates) ? data.config.businessConfig.quoteTemplates : [],
            },
          })
          if (data.config.artisanId) {
            setArtisanIdDisplay(data.config.artisanId)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsageSummary | null>(null)
  const [accountStatus, setAccountStatus] = useState<AccountStatusSummary | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [usageError, setUsageError] = useState(false)

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
      const effectiveTrades = config.trades.map(t =>
        t === 'autre' && config.otherTrade.trim() ? config.otherTrade.trim() : t
      )
      const cleanedServiceCatalog = config.businessConfig.serviceCatalog.filter(item => item.label.trim())
      const cleanedQuoteTemplates = config.businessConfig.quoteTemplates
        .filter(t => t.name.trim())
        .map(t => ({ ...t, lines: t.lines.filter(l => l.label.trim()) }))
      const res = await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          trades: effectiveTrades,
          businessConfig: { ...config.businessConfig, serviceCatalog: cleanedServiceCatalog, quoteTemplates: cleanedQuoteTemplates },
        }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('[PARAMETRES SAVE]', error)
      setSaveError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // ── Catalogue de prestations (V1) ──────────────────────────────────────
  // Stocke dans businessConfig.serviceCatalog (JSONB existant), sauvegarde
  // via le meme bouton "Enregistrer" que le reste de la page.
  const makeCatalogItemId = () => `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const addCatalogItem = () => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        serviceCatalog: [
          ...c.businessConfig.serviceCatalog,
          { id: makeCatalogItemId(), label: '', unit: 'forfait', unitPriceHT: null, vatRate: c.devisTvaDefaut || 10, isActive: true },
        ],
      },
    }))
  }

  const updateCatalogItem = (id: string, patch: Partial<ArtisanServiceCatalogItem>) => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        serviceCatalog: c.businessConfig.serviceCatalog.map(item => item.id === id ? { ...item, ...patch } : item),
      },
    }))
  }

  const removeCatalogItem = (id: string) => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        serviceCatalog: c.businessConfig.serviceCatalog.filter(item => item.id !== id),
      },
    }))
  }

  const addCatalogSuggestion = (label: string) => {
    const alreadyExists = config.businessConfig.serviceCatalog.some(
      item => item.label.trim().toLowerCase() === label.trim().toLowerCase()
    )
    if (alreadyExists) return
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        serviceCatalog: [
          ...c.businessConfig.serviceCatalog,
          { id: makeCatalogItemId(), label, unit: 'forfait', unitPriceHT: null, vatRate: c.devisTvaDefaut || 10, isActive: true },
        ],
      },
    }))
  }

  // ── Modèles de devis (V1) ───────────────────────────────────────────────
  // Stockes dans businessConfig.quoteTemplates (JSONB existant), jamais
  // utilises pour generer un devis/email/PDF automatiquement : ce sont des
  // trames reutilisables que l'artisan applique lui-meme depuis une fiche
  // projet.
  const makeTemplateId = () => `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const makeTemplateLineId = () => `tplline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const addTemplate = () => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        quoteTemplates: [
          ...c.businessConfig.quoteTemplates,
          { id: makeTemplateId(), name: '', isActive: true, lines: [] },
        ],
      },
    }))
  }

  const updateTemplate = (id: string, patch: Partial<ArtisanQuoteTemplate>) => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        quoteTemplates: c.businessConfig.quoteTemplates.map(t => t.id === id ? { ...t, ...patch } : t),
      },
    }))
  }

  const removeTemplate = (id: string) => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        quoteTemplates: c.businessConfig.quoteTemplates.filter(t => t.id !== id),
      },
    }))
  }

  const addTemplateLine = (templateId: string) => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        quoteTemplates: c.businessConfig.quoteTemplates.map(t => t.id === templateId
          ? { ...t, lines: [...t.lines, { id: makeTemplateLineId(), label: '', unit: 'forfait', unitPriceHT: null, vatRate: c.devisTvaDefaut || 10 }] }
          : t),
      },
    }))
  }

  const updateTemplateLine = (templateId: string, lineId: string, patch: Partial<ArtisanQuoteTemplateLine>) => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        quoteTemplates: c.businessConfig.quoteTemplates.map(t => t.id === templateId
          ? {
            ...t,
            lines: t.lines.map(l => {
              if (l.id !== lineId) return l
              const next = { ...l, ...patch }
              // Si la ligne se lie a une prestation du catalogue, on
              // preremplit prix/unite/TVA depuis le catalogue (jamais
              // l'inverse : le catalogue reste la source de verite des prix).
              if (patch.catalogItemId) {
                const catalogItem = c.businessConfig.serviceCatalog.find(i => i.id === patch.catalogItemId)
                if (catalogItem) {
                  next.unitPriceHT = catalogItem.unitPriceHT ?? next.unitPriceHT
                  next.unit = (catalogItem.unit as ArtisanQuoteTemplateLine['unit']) || next.unit
                  next.vatRate = catalogItem.vatRate ?? next.vatRate
                  if (!next.label.trim()) next.label = catalogItem.label
                }
              }
              return next
            }),
          }
          : t),
      },
    }))
  }

  const removeTemplateLine = (templateId: string, lineId: string) => {
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        quoteTemplates: c.businessConfig.quoteTemplates.map(t => t.id === templateId
          ? { ...t, lines: t.lines.filter(l => l.id !== lineId) }
          : t),
      },
    }))
  }

  // Suggestions initiales de modeles (Mission "quote templates", point 5) :
  // jamais sauvegardees automatiquement, juste un point de depart propose a
  // l'artisan selon ses metiers declares, qu'il peut ajouter puis editer.
  const QUOTE_TEMPLATE_SUGGESTIONS: Record<string, { name: string; lines: string[] }[]> = {
    plombier: [
      { name: 'Entretien PAC', lines: ['Entretien PAC air/air', 'Nettoyage filtres', 'Contrôle fonctionnement'] },
      { name: 'Entretien chaudière', lines: ['Entretien chaudière', 'Contrôle étanchéité', 'Nettoyage brûleur'] },
      { name: 'Remplacement chauffe-eau', lines: ['Dépose ancien chauffe-eau', 'Fourniture et pose chauffe-eau', 'Mise en service'] },
    ],
    chauffagiste: [
      { name: 'Entretien PAC', lines: ['Entretien PAC air/air', 'Nettoyage filtres', 'Contrôle fonctionnement'] },
      { name: 'Entretien chaudière', lines: ['Entretien chaudière', 'Contrôle étanchéité', 'Nettoyage brûleur'] },
      { name: 'Remplacement chauffe-eau', lines: ['Dépose ancien chauffe-eau', 'Fourniture et pose chauffe-eau', 'Mise en service'] },
    ],
    electricien: [
      { name: 'Mise en sécurité électrique', lines: ['Diagnostic installation', 'Mise en sécurité tableau', 'Remplacement disjoncteurs défectueux'] },
      { name: 'Remplacement tableau électrique', lines: ['Dépose ancien tableau', 'Fourniture et pose tableau', 'Mise aux normes'] },
      { name: 'Ajout prise/point lumineux', lines: ['Ajout prise/point lumineux', 'Tirage de câble', 'Raccordement et essais'] },
    ],
    paysagiste: [
      { name: 'Pose clôture', lines: ['Pose clôture', 'Fourniture poteaux et grillage', 'Finitions'] },
      { name: 'Taille de haies', lines: ['Taille de haies', 'Évacuation des déchets verts'] },
      { name: 'Création massif', lines: ['Création massif', 'Fourniture plantations', 'Paillage'] },
    ],
  }

  const addSuggestedTemplate = (name: string, lineLabels: string[], trade?: string) => {
    const alreadyExists = config.businessConfig.quoteTemplates.some(
      t => t.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (alreadyExists) return
    setConfig(c => ({
      ...c,
      businessConfig: {
        ...c.businessConfig,
        quoteTemplates: [
          ...c.businessConfig.quoteTemplates,
          {
            id: makeTemplateId(),
            name,
            trade,
            isActive: true,
            lines: lineLabels.map(label => ({ id: makeTemplateLineId(), label, unit: 'forfait', unitPriceHT: null, vatRate: c.devisTvaDefaut || 10 })),
          },
        ],
      },
    }))
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
    padding: isMobile ? '16px' : '24px',
    marginBottom: '16px',
    minWidth: 0,
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
          <button
            onClick={() => router.push('/dashboard-v2')}
            className="shrink-0"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-2)', cursor: 'pointer', fontSize: '14px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            ← Retour
          </button>
          <div className="flex min-w-0 items-baseline gap-2">
            <KadriaLogo size="sm" theme="dark" noLink />
            {!isMobile && (
              <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '14px' }}>
                · Configuration
              </span>
            )}
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="shrink-0"
          style={{
            background: saved ? 'rgba(34,197,94,0.2)' : saving ? 'var(--bg-hover)' : 'var(--accent)',
            border: saved ? '1px solid var(--accent)' : 'none',
            color: saved ? '#4ade80' : saving ? 'var(--text-3)' : 'black',
            fontWeight: 700, borderRadius: '10px',
            padding: isMobile ? '9px 12px' : '10px 24px', fontSize: '14px',
            cursor: saving ? 'default' : 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {saved ? '✓ Sauvegardé' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {saveError && (
        <div className="mx-3 mt-4 sm:mx-8" style={{
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          color: '#f87171',
          fontSize: '13px',
        }}>
          {saveError}
        </div>
      )}

      <div className="mx-auto grid w-full max-w-full grid-cols-1 gap-4 px-3 py-4 sm:px-6 sm:py-8 md:max-w-[900px] md:grid-cols-[220px_1fr] md:gap-6" style={{ alignItems: 'start' }}>
        {/* Sidebar navigation */}
        <div className="min-w-0" style={isMobile ? {} : { position: 'sticky', top: '80px' }}>
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
        <div className="min-w-0 w-full">
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
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>Nom de l&apos;entreprise</label>
                      <input
                        value={config.companyName}
                        onChange={e => setConfig(c => ({ ...c, companyName: e.target.value }))}
                        placeholder="Martin Rénovation"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>Prénom</label>
                      <input
                        value={config.firstName}
                        onChange={e => setConfig(c => ({ ...c, firstName: e.target.value }))}
                        placeholder="Jean"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Nom</label>
                      <input
                        value={config.lastName}
                        onChange={e => setConfig(c => ({ ...c, lastName: e.target.value }))}
                        placeholder="Martin"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={config.email}
                      onChange={e => setConfig(c => ({ ...c, email: e.target.value }))}
                      placeholder="jean@martin-renovation.fr"
                      style={inputStyle}
                    />
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
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Métiers couverts
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Sélectionnez un ou plusieurs métiers. Kadria s&apos;en sert pour mieux qualifier vos prospects.
                </p>
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
                {config.trades.includes('autre') && (
                  <div style={{ marginTop: '14px' }}>
                    <label style={labelStyle}>Précisez votre métier</label>
                    <input
                      value={config.otherTrade}
                      onChange={e => setConfig(c => ({ ...c, otherTrade: e.target.value }))}
                      placeholder="Ex : Ramoneur"
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Types de travaux souhaités
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Indiquez les demandes que vous souhaitez recevoir en priorité, et celles que vous préférez éviter.
                </p>
                {config.trades.length === 0 ? (
                  <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                    Sélectionnez d&apos;abord vos métiers pour obtenir des suggestions adaptées.
                  </p>
                ) : (() => {
                  const suggestions = getSuggestedWorkTypesForTrades(config.trades)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div>
                        <label style={labelStyle}>Travaux acceptés / recherchés</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                          {suggestions.map(w => {
                            const selected = config.businessConfig.acceptedWorkTypes.includes(w)
                            return (
                              <button
                                key={`accepted-${w}`}
                                type="button"
                                onClick={() => setConfig(c => ({
                                  ...c,
                                  businessConfig: {
                                    ...c.businessConfig,
                                    acceptedWorkTypes: selected
                                      ? c.businessConfig.acceptedWorkTypes.filter(v => v !== w)
                                      : [...c.businessConfig.acceptedWorkTypes, w],
                                  },
                                }))}
                                style={{
                                  background: selected ? 'rgba(34,197,94,0.15)' : 'var(--bg-hover)',
                                  border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                                  color: selected ? 'var(--accent)' : 'var(--text-2)',
                                  borderRadius: '20px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: selected ? 600 : 400,
                                  cursor: 'pointer',
                                }}
                              >
                                {selected ? '✓ ' : ''}{w}
                              </button>
                            )
                          })}
                        </div>
                        <input
                          value={config.businessConfig.customAcceptedWork}
                          onChange={e => setConfig(c => ({
                            ...c,
                            businessConfig: { ...c.businessConfig, customAcceptedWork: e.target.value },
                          }))}
                          placeholder="Autres travaux que vous recherchez"
                          style={{ ...inputStyle, marginTop: '10px' }}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Travaux à éviter</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                          {suggestions.map(w => {
                            const selected = config.businessConfig.refusedWorkTypes.includes(w)
                            return (
                              <button
                                key={`refused-${w}`}
                                type="button"
                                onClick={() => setConfig(c => ({
                                  ...c,
                                  businessConfig: {
                                    ...c.businessConfig,
                                    refusedWorkTypes: selected
                                      ? c.businessConfig.refusedWorkTypes.filter(v => v !== w)
                                      : [...c.businessConfig.refusedWorkTypes, w],
                                  },
                                }))}
                                style={{
                                  background: selected ? 'rgba(239,68,68,0.12)' : 'var(--bg-hover)',
                                  border: selected ? '1px solid #ef4444' : '1px solid var(--border)',
                                  color: selected ? '#ef4444' : 'var(--text-2)',
                                  borderRadius: '20px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: selected ? 600 : 400,
                                  cursor: 'pointer',
                                }}
                              >
                                {selected ? '✓ ' : ''}{w}
                              </button>
                            )
                          })}
                        </div>
                        <input
                          value={config.businessConfig.customRefusedWork}
                          onChange={e => setConfig(c => ({
                            ...c,
                            businessConfig: { ...c.businessConfig, customRefusedWork: e.target.value },
                          }))}
                          placeholder="Demandes que vous préférez éviter"
                          style={{ ...inputStyle, marginTop: '10px' }}
                        />
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Catalogue de prestations
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Ajoutez vos prestations courantes pour préremplir plus rapidement vos devis.
                </p>

                {config.businessConfig.serviceCatalog.length === 0 && config.trades.length > 0 && (() => {
                  const catalogLabels = new Set(config.businessConfig.serviceCatalog.map(i => i.label.trim().toLowerCase()))
                  const suggestions = getQuoteItemsForTrades(config.trades)
                    .filter(label => !catalogLabels.has(label.trim().toLowerCase()))
                    .slice(0, 8)
                  if (suggestions.length === 0) return null
                  return (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Suggestions à ajouter</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {suggestions.map(label => (
                          <button
                            key={`suggest-${label}`}
                            type="button"
                            onClick={() => addCatalogSuggestion(label.charAt(0).toUpperCase() + label.slice(1))}
                            style={{
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-2)',
                              borderRadius: '20px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            + {label.charAt(0).toUpperCase() + label.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {config.businessConfig.serviceCatalog.length === 0 ? (
                  <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                    Aucune prestation enregistrée pour le moment.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                    {config.businessConfig.serviceCatalog.map(item => (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '12px',
                          opacity: item.isActive === false ? 0.5 : 1,
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <input
                            value={item.label}
                            onChange={e => updateCatalogItem(item.id, { label: e.target.value })}
                            placeholder="Ex : Entretien PAC air/air"
                            style={inputStyle}
                          />
                          <input
                            value={item.category || ''}
                            onChange={e => updateCatalogItem(item.id, { category: e.target.value })}
                            placeholder="Catégorie (optionnel)"
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                          <select
                            value={item.unit || 'forfait'}
                            onChange={e => updateCatalogItem(item.id, { unit: e.target.value as ArtisanServiceCatalogItem['unit'] })}
                            style={inputStyle}
                          >
                            <option value="forfait">Forfait</option>
                            <option value="heure">Heure</option>
                            <option value="jour">Jour</option>
                            <option value="m2">m²</option>
                            <option value="ml">ml</option>
                            <option value="unite">Unité</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.unitPriceHT ?? ''}
                            onChange={e => updateCatalogItem(item.id, { unitPriceHT: e.target.value === '' ? null : Number(e.target.value) })}
                            placeholder="Prix HT"
                            style={inputStyle}
                          />
                          <select
                            value={item.vatRate ?? 20}
                            onChange={e => updateCatalogItem(item.id, { vatRate: Number(e.target.value) })}
                            style={inputStyle}
                          >
                            {[0, 5.5, 10, 20].map(rate => (
                              <option key={rate} value={rate}>{rate}% TVA</option>
                            ))}
                          </select>
                          <input
                            value={item.trade || ''}
                            onChange={e => updateCatalogItem(item.id, { trade: e.target.value })}
                            placeholder="Métier (optionnel)"
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <input
                            value={item.notes || ''}
                            onChange={e => updateCatalogItem(item.id, { notes: e.target.value })}
                            placeholder="Notes (optionnel)"
                            style={{ ...inputStyle, flex: 1, minWidth: '160px' }}
                          />
                          <label style={checkboxRowStyle}>
                            <input
                              type="checkbox"
                              checked={item.isActive !== false}
                              onChange={e => updateCatalogItem(item.id, { isActive: e.target.checked })}
                            />
                            Actif
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCatalogItem(item.id)}
                            style={{
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                              borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={addCatalogItem}
                  style={{
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--accent)',
                    borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  + Ajouter une prestation
                </button>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Modèles de devis
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Créez des trames réutilisables pour vos devis fréquents.
                </p>

                {config.businessConfig.quoteTemplates.length === 0 && config.trades.length > 0 && (() => {
                  const suggestions = config.trades.flatMap(trade => QUOTE_TEMPLATE_SUGGESTIONS[trade] || [])
                  const existingNames = new Set(config.businessConfig.quoteTemplates.map(t => t.name.trim().toLowerCase()))
                  const uniqueSuggestions = suggestions.filter((s, i, arr) =>
                    !existingNames.has(s.name.trim().toLowerCase()) &&
                    arr.findIndex(other => other.name === s.name) === i
                  )
                  if (uniqueSuggestions.length === 0) return null
                  return (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Suggestions de modèles à ajouter</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        {uniqueSuggestions.map(s => (
                          <div
                            key={`suggest-tpl-${s.name}`}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap',
                              background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px',
                            }}
                          >
                            <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                              <strong style={{ color: 'var(--text-1)' }}>{s.name}</strong>
                              {' — '}{s.lines.join(', ')}
                            </div>
                            <button
                              type="button"
                              onClick={() => addSuggestedTemplate(s.name, s.lines)}
                              style={{
                                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--accent)',
                                borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              Ajouter ce modèle
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {config.businessConfig.quoteTemplates.length === 0 ? (
                  <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                    Aucun modèle enregistré pour le moment.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                    {config.businessConfig.quoteTemplates.map(template => (
                      <div
                        key={template.id}
                        style={{
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '12px',
                          opacity: template.isActive === false ? 0.5 : 1,
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <input
                            value={template.name}
                            onChange={e => updateTemplate(template.id, { name: e.target.value })}
                            placeholder="Ex : Entretien PAC"
                            style={inputStyle}
                          />
                          <input
                            value={template.trade || ''}
                            onChange={e => updateTemplate(template.id, { trade: e.target.value })}
                            placeholder="Métier (optionnel)"
                            style={inputStyle}
                          />
                          <input
                            value={template.category || ''}
                            onChange={e => updateTemplate(template.id, { category: e.target.value })}
                            placeholder="Catégorie (optionnel)"
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <input
                            value={(template.keywords || []).join(', ')}
                            onChange={e => updateTemplate(template.id, { keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
                            placeholder="Mots-clés séparés par une virgule (optionnel)"
                            style={inputStyle}
                          />
                          <input
                            value={template.notes || ''}
                            onChange={e => updateTemplate(template.id, { notes: e.target.value })}
                            placeholder="Notes (optionnel)"
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                          {template.lines.map(line => (
                            <div
                              key={line.id}
                              style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr 1fr 1fr auto', gap: '6px', alignItems: 'center' }}
                            >
                              <input
                                value={line.label}
                                onChange={e => updateTemplateLine(template.id, line.id, { label: e.target.value })}
                                placeholder="Libellé de la ligne"
                                style={inputStyle}
                              />
                              <select
                                value={line.catalogItemId || ''}
                                onChange={e => updateTemplateLine(template.id, line.id, { catalogItemId: e.target.value || undefined })}
                                style={inputStyle}
                              >
                                <option value="">Catalogue (optionnel)</option>
                                {config.businessConfig.serviceCatalog.map(item => (
                                  <option key={item.id} value={item.id}>{item.label}</option>
                                ))}
                              </select>
                              <select
                                value={line.unit || 'forfait'}
                                onChange={e => updateTemplateLine(template.id, line.id, { unit: e.target.value as ArtisanQuoteTemplateLine['unit'] })}
                                style={inputStyle}
                              >
                                <option value="forfait">Forfait</option>
                                <option value="heure">Heure</option>
                                <option value="jour">Jour</option>
                                <option value="m2">m²</option>
                                <option value="ml">ml</option>
                                <option value="unite">Unité</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={line.unitPriceHT ?? ''}
                                onChange={e => updateTemplateLine(template.id, line.id, { unitPriceHT: e.target.value === '' ? null : Number(e.target.value) })}
                                placeholder="Prix HT"
                                style={inputStyle}
                              />
                              <select
                                value={line.vatRate ?? 20}
                                onChange={e => updateTemplateLine(template.id, line.id, { vatRate: Number(e.target.value) })}
                                style={inputStyle}
                              >
                                {[0, 5.5, 10, 20].map(rate => (
                                  <option key={rate} value={rate}>{rate}% TVA</option>
                                ))}
                              </select>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <label style={{ ...checkboxRowStyle, fontSize: '11px' }}>
                                  <input
                                    type="checkbox"
                                    checked={line.optional === true}
                                    onChange={e => updateTemplateLine(template.id, line.id, { optional: e.target.checked })}
                                  />
                                  Opt.
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeTemplateLine(template.id, line.id)}
                                  style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                                    borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addTemplateLine(template.id)}
                            style={{
                              background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-2)',
                              borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-start',
                            }}
                          >
                            + Ajouter une ligne
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <label style={checkboxRowStyle}>
                            <input
                              type="checkbox"
                              checked={template.isActive !== false}
                              onChange={e => updateTemplate(template.id, { isActive: e.target.checked })}
                            />
                            Actif
                          </label>
                          <button
                            type="button"
                            onClick={() => removeTemplate(template.id)}
                            style={{
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                              borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={addTemplate}
                  style={{
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--accent)',
                    borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  + Ajouter un modèle
                </button>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Zone d&apos;intervention
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Zone d&apos;intervention</label>
                    <input
                      value={config.serviceArea}
                      onChange={e => setConfig(c => ({ ...c, serviceArea: e.target.value }))}
                      placeholder="Paris et proche banlieue"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Rayon d&apos;intervention (km)</label>
                    <input
                      type="number"
                      min={0}
                      value={config.interventionRadius}
                      onChange={e => setConfig(c => ({ ...c, interventionRadius: Number(e.target.value) }))}
                      placeholder="30"
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
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Couleur principale</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={e => setConfig(c => ({ ...c, primaryColor: e.target.value }))}
                        style={{
                          width: isMobile ? '40px' : '48px', height: '44px',
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
                          width: isMobile ? '40px' : '48px', height: '44px',
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
                    <AddressAutocomplete
                      value={config.address}
                      onChange={value => setConfig(c => ({ ...c, address: value }))}
                      onSelect={selection => setConfig(c => ({
                        ...c,
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

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Notifications
                </h3>
                <div>
                  <label style={labelStyle}>Email de notification</label>
                  <input
                    type="email"
                    value={config.notificationEmail}
                    onChange={e => setConfig(c => ({ ...c, notificationEmail: e.target.value }))}
                    placeholder="contact@martin-renovation.fr"
                    style={inputStyle}
                  />
                  <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                    Adresse utilisée pour recevoir les notifications de nouveaux dossiers et devis.
                  </p>
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

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
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
                    <AddressAutocomplete
                      value={config.adressePro}
                      onChange={value => setConfig(c => ({ ...c, adressePro: value }))}
                      onSelect={selection => setConfig(c => ({
                        ...c,
                        adressePro: selection.address,
                        cpPro: selection.postalCode || c.cpPro,
                        villePro: selection.city || c.villePro,
                      }))}
                      placeholder="12 rue de la Paix"
                      style={inputStyle}
                    />
                    {legalErrors.adressePro && <p style={errorStyle}>{legalErrors.adressePro}</p>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
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

          {activeSection === 'vehicule' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                🚗 Véhicule & déplacements
              </h2>
              <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 16px' }}>
                Ces informations permettent d&apos;estimer le coût d&apos;un déplacement entre votre
                adresse professionnelle et un chantier (fonctionnalité disponible avec le plan Performance).
              </p>
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Motorisation
                </h3>
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

                  {!config.travelConfig.originLat && (
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
                      L&apos;adresse professionnelle (section Infos légales) doit être renseignée pour calculer une distance.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ ...sectionCard, marginTop: '16px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Recommandation de frais de déplacement
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Frais minimum de déplacement</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="25"
                        value={config.travelConfig.minimumTravelFee ?? ''}
                        onChange={e => setConfig(c => ({
                          ...c,
                          travelConfig: {
                            ...c.travelConfig,
                            minimumTravelFee: e.target.value === '' ? undefined : Number(e.target.value),
                          },
                        }))}
                        style={{ ...inputStyle, paddingRight: '32px' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '13px' }}>€</span>
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: '6px 0 0' }}>
                      Montant minimum conseillé à intégrer lorsque vous vous déplacez chez un prospect ou client.
                    </p>
                  </div>

                  <div>
                    <label style={labelStyle}>Zone sans frais de déplacement</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="10"
                        value={config.travelConfig.freeTravelRadiusKm ?? ''}
                        onChange={e => setConfig(c => ({
                          ...c,
                          travelConfig: {
                            ...c.travelConfig,
                            freeTravelRadiusKm: e.target.value === '' ? undefined : Number(e.target.value),
                          },
                        }))}
                        style={{ ...inputStyle, paddingRight: '36px' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '13px' }}>km</span>
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '11px', margin: '6px 0 0' }}>
                      Dans ce rayon autour de votre adresse professionnelle, Kadria ne recommandera pas forcément de frais supplémentaires.
                    </p>
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
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '14px' }}>
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

          {/* Section Offre & quotas */}
          {activeSection === 'offre' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                💳 Offre & quotas
              </h2>

              {usageLoading ? (
                <div style={sectionCard}>
                  <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>Chargement…</p>
                </div>
              ) : usageError || !monthlyUsage ? (
                <div style={sectionCard}>
                  <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
                    Informations d&apos;utilisation indisponibles pour le moment.
                  </p>
                </div>
              ) : (
                <>
                  <div style={sectionCard}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                      Votre offre
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Plan actuel</p>
                        <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700, textTransform: 'capitalize' }}>
                          {accountStatus?.plan || monthlyUsage.plan}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Statut</p>
                        <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                          {accountStatus?.status
                            ? (ACCOUNT_STATUS_LABELS[accountStatus.status.toLowerCase()] || accountStatus.status)
                            : 'Statut non disponible'}
                        </p>
                      </div>
                      {accountStatus?.trialEndDate && (
                        <div>
                          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Fin d&apos;essai</p>
                          <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600 }}>{accountStatus.trialEndDate}</p>
                        </div>
                      )}
                      {accountStatus?.billingStatus && (
                        <div>
                          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Facturation</p>
                          <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600 }}>{accountStatus.billingStatus}</p>
                        </div>
                      )}
                      {accountStatus?.nextBilling && (
                        <div>
                          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Prochaine échéance</p>
                          <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600 }}>{accountStatus.nextBilling}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={sectionCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)' }}>
                        Utilisation du mois
                      </h3>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '2px 10px',
                        background: 'rgba(34,197,94,0.1)', color: 'var(--accent)',
                      }}>
                        {USAGE_STATUS_LABELS[
                          ([monthlyUsage.projects.status, monthlyUsage.vapi.status].includes('exceeded') && 'exceeded')
                          || ([monthlyUsage.projects.status, monthlyUsage.vapi.status].includes('limit_reached') && 'limit_reached')
                          || ([monthlyUsage.projects.status, monthlyUsage.vapi.status].includes('warning') && 'warning')
                          || 'ok'
                        ]}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '14px' }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Dossiers</p>
                        <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                          {monthlyUsage.projects.unlimited
                            ? `${monthlyUsage.projects.used} / Illimité`
                            : `${monthlyUsage.projects.used} / ${monthlyUsage.projects.limit ?? 0}`}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Appels vocaux</p>
                        <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                          {monthlyUsage.vapi.callsUnlimited
                            ? `${monthlyUsage.vapi.callsUsed} / Illimité`
                            : monthlyUsage.vapi.callsLimit === 0
                              ? 'Non inclus'
                              : `${monthlyUsage.vapi.callsUsed} / ${monthlyUsage.vapi.callsLimit}`}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>Minutes vocales</p>
                        <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                          {monthlyUsage.vapi.minutesLimit === null
                            ? `${monthlyUsage.vapi.minutesUsed} min / Non limité`
                            : `${monthlyUsage.vapi.minutesUsed} / ${monthlyUsage.vapi.minutesLimit} min`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={sectionCard}>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>
                      Ces compteurs se réinitialisent automatiquement chaque mois. Aucune action n&apos;est requise de votre part.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
