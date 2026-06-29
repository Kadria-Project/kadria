'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import { useTheme } from '@/src/hooks/useTheme'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline'
import AssistantAvatarBubble, { PRESET_AVATARS } from '@/src/components/chat/AssistantAvatarBubble'
import { ARTISAN_TRADES } from '@/src/config/trades'
import { getQuoteItemsForTrades } from '@/src/config/trade-taxonomy'
import type { ArtisanServiceCatalogItem, ArtisanQuoteTemplate, ArtisanQuoteTemplateLine, QuoteCommercialSettings } from '@/src/lib/quote-suggestions'
import {
  VehicleType,
  ChargingType,
  VEHICLE_TYPE_LABELS,
  CHARGING_TYPE_LABELS,
  DEFAULT_CONSUMPTION_PER_100KM,
} from '@/src/config/travel'

const SECTIONS: Array<{ id: string; label: string; icon: string; href?: string }> = [
  { id: 'entreprise', label: 'Mon entreprise', icon: '🏢' },
  { id: 'widget', label: 'Mon widget', icon: '🎨' },
  { id: 'contact', label: 'Coordonnées', icon: '📍' },
  { id: 'legal', label: 'Infos légales', icon: '📋' },
  { id: 'vehicule', label: 'Déplacements', icon: '🚗' },
  { id: 'catalogue', label: 'Catalogue & devis', icon: '📒' },
  { id: 'apparence', label: 'Apparence', icon: '🌓' },
  { id: 'offre', label: 'Offre & quotas', icon: '💳' },
]

// Groupes visuels du menu latéral des paramètres
const SETTINGS_GROUPS: Array<{ label: string; items: Array<{ id: string; label: string; icon: string; href?: string }> }> = [
  {
    label: 'Configuration',
    items: [
      SECTIONS[0]!,
      { id: 'profil-metier', label: 'Profil métier', icon: '🛠️', href: '/parametres/profil-metier' },
      SECTIONS[2]!,
      SECTIONS[3]!,
    ],
  },
  {
    label: 'Activité',
    items: [
      SECTIONS[4]!,
      SECTIONS[5]!,
      SECTIONS[1]!,
    ],
  },
  {
    label: 'Compte',
    items: [
      SECTIONS[6]!,
      SECTIONS[7]!,
    ],
  },
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
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasStripeCustomer: boolean
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
  trialing: 'Essai gratuit en cours',
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

// Normalise les champs spécialités/prestations exclues du Profil métier,
// stockés en tableau côté Supabase mais parfois saisis/édités sous forme de
// texte séparé par des virgules — accepte les deux formats sans dupliquer
// la donnée.
function toReadonlyList(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => v.trim()).filter((v) => v.length > 0)
  }
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter((v) => v.length > 0)
  }
  return []
}

function WorkTypeReadOnlyChips({ values, accent }: { values: string[]; accent: 'green' | 'red' }) {
  const accentColor = accent === 'green' ? '#4ade80' : '#f87171'
  const accentBg = accent === 'green' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'
  const accentBorder = accent === 'green' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'

  if (values.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
      {values.map((v) => (
        <span
          key={v}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: accentBg,
            border: `1px solid ${accentBorder}`,
            color: accentColor,
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 600,
            maxWidth: '100%',
            overflowWrap: 'anywhere',
          }}
        >
          {v}
        </span>
      ))}
    </div>
  )
}

export default function ParametresPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [activeSection, setActiveSection] = useState('entreprise')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingTarget, setUploadingTarget] = useState<null | 'company_logo' | 'assistant_avatar' | 'white_label_logo'>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [config, setConfig] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    plan: 'essentiel' as string,
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
    assistantAvatarType: 'kadria_default',
    assistantAvatarUrl: '',
    welcomeName: '',
    welcomeMessage: '',
    primaryColor: '#22c55e',
    secondaryColor: '#18181b',
    websiteUrl: '',
    whiteLabelEnabled: false,
    widgetBrandName: '',
    widgetBrandLogoUrl: '',
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
      quoteSettings: {} as QuoteCommercialSettings,
    },
  })

  const [legalErrors, setLegalErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')

  // Profil métier (Supabase, source de vérité) : chargé uniquement pour
  // afficher un résumé en lecture et pour nourrir les suggestions plus bas
  // sur cette page (types de travaux, catalogue, modèles de devis), qui
  // restent sur cette page pour ne pas régresser leurs sections — mais ne
  // doivent plus dépendre de l'ancien sélecteur de métiers ci-dessous.
  const [businessProfileTrades, setBusinessProfileTrades] = useState<{ primaryTrade: string; coveredTrades: string[] } | null>(null)
  // Spécialités / prestations exclues du Profil métier (Supabase, source de
  // vérité) : réutilisées en lecture seule pour les blocs "Types de travaux
  // acceptés/refusés" ci-dessous afin de ne pas dupliquer la donnée.
  const [businessProfileWorkTypes, setBusinessProfileWorkTypes] = useState<{ specialties: string[]; excludedServices: string[] } | null>(null)
  useEffect(() => {
    fetch('/api/artisan/business-profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.profile) {
          setBusinessProfileTrades({
            primaryTrade: typeof data.profile.primary_trade === 'string' ? data.profile.primary_trade : '',
            coveredTrades: Array.isArray(data.profile.covered_trades) ? data.profile.covered_trades.filter((t: unknown) => typeof t === 'string') : [],
          })
          setBusinessProfileWorkTypes({
            specialties: toReadonlyList(data.profile.specialties),
            excludedServices: toReadonlyList(data.profile.excluded_services),
          })
        }
      })
      .catch(() => {})
  }, [])

  // Métiers effectifs utilisés par les suggestions de cette page (types de
  // travaux, catalogue, modèles de devis) : priorité au Profil métier
  // (Supabase, source de vérité), repli sur les anciens "Métiers couverts"
  // (config.trades) tant que le Profil métier n'est pas renseigné.
  const effectiveTradesForSuggestions = (() => {
    const primary = businessProfileTrades?.primaryTrade?.trim()
    const covered = businessProfileTrades?.coveredTrades || []
    if (primary || covered.length > 0) {
      return [primary, ...covered].filter((t): t is string => Boolean(t))
    }
    return config.trades
  })()

  const [artisanIdDisplay, setArtisanIdDisplay] = useState('VOTRE_ARTISAN_ID')
  const [copied, setCopied] = useState(false)
  const [widgetPreviewKey, setWidgetPreviewKey] = useState(0)

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
            plan: data.config.plan || 'essentiel',
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
            assistantAvatarType: data.config.assistantAvatarType || 'kadria_default',
            assistantAvatarUrl: data.config.assistantAvatarUrl || '',
            welcomeName: data.config.welcomeName || '',
            welcomeMessage: data.config.welcomeMessage || '',
            primaryColor: data.config.primaryColor || '#22c55e',
            secondaryColor: data.config.secondaryColor || '#18181b',
            websiteUrl: data.config.websiteUrl || '',
            whiteLabelEnabled: Boolean(data.config.whiteLabelEnabled),
            widgetBrandName: data.config.widgetBrandName || '',
            widgetBrandLogoUrl: data.config.widgetBrandLogoUrl || '',
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
            businessConfig: (() => {
              const rawAccepted: string[] = Array.isArray(data.config.businessConfig?.acceptedWorkTypes) ? data.config.businessConfig.acceptedWorkTypes : []
              const rawRefused: string[] = Array.isArray(data.config.businessConfig?.refusedWorkTypes) ? data.config.businessConfig.refusedWorkTypes : []
              const legacyCustomAccepted = String(data.config.businessConfig?.customAcceptedWork || '').trim()
              const legacyCustomRefused = String(data.config.businessConfig?.customRefusedWork || '').trim()
              return {
                acceptedWorkTypes: legacyCustomAccepted && !rawAccepted.includes(legacyCustomAccepted) ? [...rawAccepted, legacyCustomAccepted] : rawAccepted,
                refusedWorkTypes: legacyCustomRefused && !rawRefused.includes(legacyCustomRefused) ? [...rawRefused, legacyCustomRefused] : rawRefused,
                customAcceptedWork: '',
                customRefusedWork: '',
                serviceCatalog: Array.isArray(data.config.businessConfig?.serviceCatalog) ? data.config.businessConfig.serviceCatalog : [],
                quoteTemplates: Array.isArray(data.config.businessConfig?.quoteTemplates) ? data.config.businessConfig.quoteTemplates : [],
                quoteSettings: (data.config.businessConfig?.quoteSettings && typeof data.config.businessConfig.quoteSettings === 'object')
                  ? data.config.businessConfig.quoteSettings
                  : {},
              }
            })(),
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
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const openBillingPortal = async () => {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.success && data.url) {
        window.location.href = data.url
        return
      }
      setPortalError(data.error || 'Impossible d’ouvrir la gestion d’abonnement.')
    } catch {
      setPortalError('Impossible d’ouvrir la gestion d’abonnement.')
    } finally {
      setPortalLoading(false)
    }
  }

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

  const uploadBrandingImage = async (
    file: File,
    target: 'company_logo' | 'assistant_avatar' | 'white_label_logo'
  ): Promise<string | null> => {
    setUploadingTarget(target)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('target', target)
      const res = await fetch('/api/uploads/artisan-branding', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!data.success || !data.url) {
        throw new Error(data.error || "Erreur lors de l'import de l'image")
      }
      return data.url as string
    } catch (error) {
      console.error('[PARAMETRES UPLOAD]', error)
      setUploadError(error instanceof Error ? error.message : "Erreur lors de l'import de l'image")
      return null
    } finally {
      setUploadingTarget(null)
    }
  }

  const handleCompanyLogoFile = async (file: File) => {
    const url = await uploadBrandingImage(file, 'company_logo')
    if (url) setConfig(c => ({ ...c, logoUrl: url }))
  }

  const handleAssistantAvatarFile = async (file: File) => {
    const url = await uploadBrandingImage(file, 'assistant_avatar')
    if (url) setConfig(c => ({ ...c, assistantAvatarType: 'custom_upload', assistantAvatarUrl: url }))
  }

  const handleWhiteLabelLogoFile = async (file: File) => {
    const url = await uploadBrandingImage(file, 'white_label_logo')
    if (url) setConfig(c => ({ ...c, widgetBrandLogoUrl: url }))
  }

  // Les types de travaux acceptés/refusés sont en lecture seule sur cette
  // page : leur édition se fait désormais uniquement depuis le Profil métier.

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
            <KadriaLogo size="sm" theme={theme === 'light' ? 'light' : 'dark'} noLink />
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
            {SETTINGS_GROUPS.map((group, gi) => (
              <div key={group.label} style={isMobile ? { display: 'flex', gap: '8px' } : {}}>
                {!isMobile && (
                  <p style={{
                    color: 'var(--text-3)', fontSize: '10px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    margin: gi === 0 ? '2px 14px 6px' : '14px 14px 6px',
                  }}>
                    {group.label}
                  </p>
                )}
                {group.items.map(section => (
                  <button
                    key={section.id}
                    onClick={() => {
                      if (section.href) {
                        router.push(section.href)
                        return
                      }
                      setActiveSection(section.id)
                    }}
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
            ))}
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
                  Identité
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
                    <label style={labelStyle}>Nom de l&apos;entreprise</label>
                    <input
                      value={config.companyName}
                      onChange={e => setConfig(c => ({ ...c, companyName: e.target.value }))}
                      placeholder="Martin Rénovation"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
                    <label style={labelStyle}>Site web</label>
                    <input
                      value={config.websiteUrl}
                      onChange={e => setConfig(c => ({ ...c, websiteUrl: e.target.value }))}
                      placeholder="https://monsite.fr"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
                    <label style={labelStyle}>Nom de l&apos;assistant dans le widget</label>
                    <input
                      value={config.welcomeName}
                      onChange={e => setConfig(c => ({ ...c, welcomeName: e.target.value }))}
                      placeholder="Assistant Martin Rénovation"
                      style={inputStyle}
                    />
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '5px 0 0' }}>
                      Affiché dans le header du widget à la place de &quot;Kadria&quot; (remplacé par la marque blanche si elle est activée).
                    </p>
                  </div>
                  <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
                    <label style={labelStyle}>Logo de l&apos;entreprise</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {config.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={config.logoUrl}
                          alt="Logo entreprise"
                          style={{
                            height: '40px', maxWidth: '120px',
                            objectFit: 'contain', borderRadius: '6px',
                            border: '1px solid var(--border)', background: 'var(--bg-hover)', padding: '4px',
                          }}
                          onError={e => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                      <label
                        style={{
                          padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                          border: '1px solid var(--border)', background: 'var(--bg-hover)',
                          color: 'var(--text-2)', cursor: uploadingTarget === 'company_logo' ? 'default' : 'pointer',
                          opacity: uploadingTarget === 'company_logo' ? 0.6 : 1,
                        }}
                      >
                        {uploadingTarget === 'company_logo' ? 'Import en cours...' : config.logoUrl ? 'Remplacer' : 'Importer un logo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploadingTarget === 'company_logo'}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleCompanyLogoFile(file)
                            e.target.value = ''
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {config.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setConfig(c => ({ ...c, logoUrl: '' }))}
                          style={{
                            padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text-3)', cursor: 'pointer',
                          }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                      PNG, JPG ou WEBP, 4 Mo maximum.
                    </p>
                    {uploadError && uploadingTarget === null && (
                      <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{uploadError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>
                  Contact principal
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: isMobile ? '100%' : '420px' }}>
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
                </div>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Métiers couverts
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 12px' }}>
                  {businessProfileTrades?.primaryTrade ? (
                    <>
                      Métier principal : <strong style={{ color: 'var(--text-1)' }}>
                        {ARTISAN_TRADES.find(t => t.value === businessProfileTrades.primaryTrade)?.label || businessProfileTrades.primaryTrade}
                      </strong>
                      {businessProfileTrades.coveredTrades.length > 0 && (
                        <>
                          {' '}· Métiers secondaires :{' '}
                          <strong style={{ color: 'var(--text-1)' }}>
                            {businessProfileTrades.coveredTrades
                              .map(v => ARTISAN_TRADES.find(t => t.value === v)?.label || v)
                              .join(', ')}
                          </strong>
                        </>
                      )}
                    </>
                  ) : (
                    'Aucun métier configuré pour le moment.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/parametres/profil-metier')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Configurez votre métier principal et vos domaines couverts depuis votre Profil métier →
                </button>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Types de travaux acceptés
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 12px' }}>
                  {(businessProfileWorkTypes?.specialties.length || 0) === 0
                    ? 'Aucun type de travaux accepté configuré'
                    : 'Ces éléments correspondent aux spécialités renseignées dans votre profil métier.'}
                </p>
                <WorkTypeReadOnlyChips values={businessProfileWorkTypes?.specialties || []} accent="green" />
                <button
                  type="button"
                  onClick={() => router.push('/parametres/profil-metier')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: (businessProfileWorkTypes?.specialties.length || 0) > 0 ? '12px' : 0,
                  }}
                >
                  Modifier dans le profil métier →
                </button>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Types de travaux refusés
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 12px' }}>
                  {(businessProfileWorkTypes?.excludedServices.length || 0) === 0
                    ? 'Aucun type de travaux refusé configuré'
                    : 'Ces éléments correspondent aux prestations exclues renseignées dans votre profil métier.'}
                </p>
                <WorkTypeReadOnlyChips values={businessProfileWorkTypes?.excludedServices || []} accent="red" />
                <button
                  type="button"
                  onClick={() => router.push('/parametres/profil-metier')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: (businessProfileWorkTypes?.excludedServices.length || 0) > 0 ? '12px' : 0,
                  }}
                >
                  Modifier dans le profil métier →
                </button>
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
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Tester mon widget
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 12px' }}>
                  Visualisez et testez le widget tel qu&apos;il apparaîtra sur votre site.
                </p>
                <div style={{
                  background: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  height: isMobile ? '480px' : '560px',
                }}>
                  <ChatWidgetInline
                    key={widgetPreviewKey}
                    artisanId={artisanIdDisplay}
                    artisanName={config.companyName || "l'artisan"}
                    primaryColor={config.primaryColor}
                    secondaryColor={config.secondaryColor}
                    welcomeNameOverride={config.welcomeName}
                    welcomeMessageOverride={config.welcomeMessage}
                    assistantAvatarType={config.assistantAvatarType}
                    assistantAvatarUrl={config.assistantAvatarUrl}
                    logoUrl={config.logoUrl}
                    whiteLabelEnabled={config.plan === 'performance' || config.plan === 'entreprise' ? config.whiteLabelEnabled : false}
                    widgetBrandName={config.widgetBrandName}
                    widgetBrandLogoUrl={config.widgetBrandLogoUrl}
                    companyNameOverride={config.companyName}
                    planOverride={config.plan}
                    fitParentHeight
                    previewMode
                  />
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '8px', marginTop: '12px',
                }}>
                  <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0 }}>
                    ⚠️ Les messages envoyés ici servent uniquement à tester le widget. Aucun dossier réel n&apos;est créé.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWidgetPreviewKey(k => k + 1)}
                    style={{
                      background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)',
                      borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Réinitialiser la conversation
                  </button>
                </div>
              </div>

              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Avatar de l&apos;assistant
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Choisissez l&apos;image qui apparaîtra dans la bulle de votre assistant, à la place du logo Kadria.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <AssistantAvatarBubble
                    assistantAvatarType={config.assistantAvatarType}
                    assistantAvatarUrl={config.assistantAvatarUrl}
                    logoUrl={config.logoUrl}
                    primaryColor={config.primaryColor}
                    size={48}
                  />
                  <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>Aperçu dans le widget</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {([
                    { id: 'company_logo', label: "Logo de l'entreprise" },
                    { id: 'custom_upload', label: 'Image personnalisée' },
                    { id: 'preset', label: 'Avatar proposé' },
                    { id: 'kadria_default', label: 'Logo Kadria par défaut' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, assistantAvatarType: opt.id }))}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: config.assistantAvatarType === opt.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: config.assistantAvatarType === opt.id ? 'var(--accent-soft, rgba(34,197,94,0.12))' : 'var(--bg-hover)',
                        color: config.assistantAvatarType === opt.id ? 'var(--accent)' : 'var(--text-2)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {config.assistantAvatarType === 'custom_upload' && (
                  <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
                    <label style={labelStyle}>Image personnalisée</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {config.assistantAvatarUrl && (
                        <AssistantAvatarBubble
                          assistantAvatarType="custom_upload"
                          assistantAvatarUrl={config.assistantAvatarUrl}
                          size={40}
                        />
                      )}
                      <label
                        style={{
                          padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                          border: '1px solid var(--border)', background: 'var(--bg-hover)',
                          color: 'var(--text-2)', cursor: uploadingTarget === 'assistant_avatar' ? 'default' : 'pointer',
                          opacity: uploadingTarget === 'assistant_avatar' ? 0.6 : 1,
                        }}
                      >
                        {uploadingTarget === 'assistant_avatar' ? 'Import en cours...' : 'Importer une image'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploadingTarget === 'assistant_avatar'}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleAssistantAvatarFile(file)
                            e.target.value = ''
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setConfig(c => ({ ...c, assistantAvatarType: 'kadria_default', assistantAvatarUrl: '' }))}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                          border: '1px solid var(--border)', background: 'var(--bg-hover)',
                          color: 'var(--text-2)', cursor: 'pointer',
                        }}
                      >
                        Réinitialiser
                      </button>
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                      PNG, JPG ou WEBP, 4 Mo maximum.
                    </p>
                    {uploadError && uploadingTarget === null && (
                      <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{uploadError}</p>
                    )}
                  </div>
                )}

                {config.assistantAvatarType === 'preset' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '10px', maxWidth: isMobile ? '100%' : '420px' }}>
                    {PRESET_AVATARS.map(preset => {
                      const ref = `preset:${preset.id}`
                      const active = config.assistantAvatarUrl === ref
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setConfig(c => ({ ...c, assistantAvatarUrl: ref }))}
                          title={preset.label}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            padding: '8px', borderRadius: '10px', cursor: 'pointer',
                            border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: active ? 'var(--accent-soft, rgba(34,197,94,0.12))' : 'var(--bg-hover)',
                          }}
                        >
                          <AssistantAvatarBubble
                            assistantAvatarType="preset"
                            assistantAvatarUrl={ref}
                            size={36}
                          />
                          <span style={{ fontSize: '10.5px', color: 'var(--text-3)', textAlign: 'center' }}>{preset.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

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
                  Personnalisez le premier message affiché au prospect.
                  Le moteur de qualification Kadria reste identique.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

              {/* Marque blanche — réservée aux plans Performance/Agence */}
              <div style={sectionCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)' }}>
                    Marque blanche
                  </h3>
                  <span style={{
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80',
                    borderRadius: '999px',
                    padding: '2px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}>
                    Performance
                  </span>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Affichez votre propre marque dans l&apos;assistant, à la place du branding Kadria.
                </p>

                {config.plan !== 'performance' && config.plan !== 'entreprise' ? (
                  <div style={{
                    background: 'var(--bg-hover)',
                    border: '1px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px' }}>
                      🔒 Cette fonctionnalité est réservée aux plans <strong>Performance</strong> et <strong>Agence</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSection('offre')}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'var(--accent)',
                        border: 'none',
                        color: '#09090b',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Passer au plan Performance
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={config.whiteLabelEnabled}
                        onChange={e => setConfig(c => ({ ...c, whiteLabelEnabled: e.target.checked }))}
                      />
                      Activer la marque blanche
                    </label>

                    <div>
                      <label style={labelStyle}>Nom affiché dans le widget</label>
                      <input
                        value={config.widgetBrandName}
                        onChange={e => setConfig(c => ({ ...c, widgetBrandName: e.target.value }))}
                        placeholder="Ma Marque"
                        disabled={!config.whiteLabelEnabled}
                        style={{ ...inputStyle, opacity: config.whiteLabelEnabled ? 1 : 0.6 }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Logo de la marque</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', opacity: config.whiteLabelEnabled ? 1 : 0.6 }}>
                        {config.widgetBrandLogoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={config.widgetBrandLogoUrl}
                            alt="Aperçu du logo de marque"
                            style={{ height: '32px', maxWidth: '160px', objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        )}
                        <label
                          style={{
                            padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                            border: '1px solid var(--border)', background: 'var(--bg-hover)',
                            color: 'var(--text-2)',
                            cursor: !config.whiteLabelEnabled || uploadingTarget === 'white_label_logo' ? 'default' : 'pointer',
                          }}
                        >
                          {uploadingTarget === 'white_label_logo' ? 'Import en cours...' : 'Importer un logo marque blanche'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={!config.whiteLabelEnabled || uploadingTarget === 'white_label_logo'}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleWhiteLabelLogoFile(file)
                              e.target.value = ''
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {config.logoUrl && (
                          <button
                            type="button"
                            disabled={!config.whiteLabelEnabled}
                            onClick={() => setConfig(c => ({ ...c, widgetBrandLogoUrl: c.logoUrl }))}
                            style={{
                              padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--text-2)', cursor: config.whiteLabelEnabled ? 'pointer' : 'default',
                            }}
                          >
                            Utiliser le logo entreprise
                          </button>
                        )}
                        {config.widgetBrandLogoUrl && (
                          <button
                            type="button"
                            disabled={!config.whiteLabelEnabled}
                            onClick={() => setConfig(c => ({ ...c, widgetBrandLogoUrl: '' }))}
                            style={{
                              padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--text-3)', cursor: config.whiteLabelEnabled ? 'pointer' : 'default',
                            }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                        PNG, JPG ou WEBP, 4 Mo maximum.
                      </p>
                      {uploadError && uploadingTarget === null && (
                        <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{uploadError}</p>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                    }}>
                      {(() => {
                        // Même règle que ChatWidgetInline.resolveWidgetBranding :
                        // marque blanche active (et plan Performance/Agence,
                        // déjà garanti par cette section) → logo de marque >
                        // logo entreprise pour l'image, nom de marque >
                        // companyName > "Kadria" pour le texte. Sinon "Kadria".
                        const isWhiteLabelActive = config.whiteLabelEnabled
                        const previewLogoUrl = isWhiteLabelActive ? (config.widgetBrandLogoUrl || config.logoUrl || '') : ''
                        const previewLabel = isWhiteLabelActive
                          ? (config.widgetBrandName || config.companyName || 'Kadria')
                          : 'Kadria'
                        return (
                          <>
                            {previewLogoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={previewLogoUrl}
                                alt=""
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : null}
                            <span style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600 }}>
                              {previewLabel}
                            </span>
                          </>
                        )
                      })()}
                      <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>Aperçu du header</span>
                    </div>
                  </div>
                )}
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

                  {!config.assuranceNonRequise && (
                    <>
                      <label style={checkboxRowStyle}>
                        <input
                          type="checkbox"
                          checked={!!config.businessConfig?.quoteSettings?.insuranceEnabled}
                          onChange={e => setConfig(c => ({
                            ...c,
                            businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig?.quoteSettings, insuranceEnabled: e.target.checked } },
                          }))}
                        />
                        Afficher le détail de l&apos;assurance (type, activités couvertes, zone) sur les devis
                      </label>

                      {config.businessConfig?.quoteSettings?.insuranceEnabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                          <div>
                            <label style={labelStyle}>Type d&apos;assurance</label>
                            <select
                              value={config.businessConfig?.quoteSettings?.insuranceType || 'decennale'}
                              onChange={e => setConfig(c => ({
                                ...c,
                                businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig?.quoteSettings, insuranceType: e.target.value as 'rc_pro' | 'decennale' | 'rc_pro_decennale' } },
                              }))}
                              style={inputStyle}
                            >
                              <option value="decennale">Assurance décennale</option>
                              <option value="rc_pro">Responsabilité civile professionnelle</option>
                              <option value="rc_pro_decennale">RC professionnelle et décennale</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Zone géographique couverte</label>
                            <input
                              value={config.businessConfig?.quoteSettings?.insuranceGeographicCoverage || ''}
                              onChange={e => setConfig(c => ({
                                ...c,
                                businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig?.quoteSettings, insuranceGeographicCoverage: e.target.value } },
                              }))}
                              placeholder="France métropolitaine"
                              style={inputStyle}
                            />
                          </div>
                          <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                            <label style={labelStyle}>Activités couvertes</label>
                            <input
                              value={config.businessConfig?.quoteSettings?.insuranceCoveredActivities || ''}
                              onChange={e => setConfig(c => ({
                                ...c,
                                businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig?.quoteSettings, insuranceCoveredActivities: e.target.value } },
                              }))}
                              placeholder="Plomberie, chauffage, ..."
                              style={inputStyle}
                            />
                          </div>
                          <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                            <label style={labelStyle}>Adresse de l&apos;assureur (optionnel)</label>
                            <input
                              value={config.businessConfig?.quoteSettings?.insuranceProviderAddress || ''}
                              onChange={e => setConfig(c => ({
                                ...c,
                                businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig?.quoteSettings, insuranceProviderAddress: e.target.value } },
                              }))}
                              placeholder="Adresse de la compagnie d'assurance"
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      )}
                    </>
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

          {activeSection === 'catalogue' && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
                📒 Catalogue & devis
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '-12px 0 16px' }}>
                Votre catalogue de prestations, vos modèles de devis et vos paramètres par défaut.
              </p>
              <div style={sectionCard}>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Catalogue de prestations
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Ajoutez vos prestations courantes pour préremplir plus rapidement vos devis.
                </p>

                {config.businessConfig.serviceCatalog.length === 0 && effectiveTradesForSuggestions.length > 0 && (() => {
                  const catalogLabels = new Set(config.businessConfig.serviceCatalog.map(i => i.label.trim().toLowerCase()))
                  const suggestions = getQuoteItemsForTrades(effectiveTradesForSuggestions)
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

                {config.businessConfig.quoteTemplates.length === 0 && effectiveTradesForSuggestions.length > 0 && (() => {
                  const suggestions = effectiveTradesForSuggestions.flatMap(trade => QUOTE_TEMPLATE_SUGGESTIONS[trade] || [])
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
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--accent)' }}>
                  Paramètres de devis
                </h3>
                <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
                  Définissez les valeurs utilisées par défaut lorsque vous créez un devis.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={labelStyle}>TVA par défaut (%)</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={config.businessConfig.quoteSettings.defaultVatRate ?? ''}
                      onChange={e => setConfig(c => ({
                        ...c,
                        businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, defaultVatRate: e.target.value === '' ? undefined : Number(e.target.value) } },
                      }))}
                      placeholder="20"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Validité du devis (jours)</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={config.businessConfig.quoteSettings.defaultValidityDays ?? ''}
                      onChange={e => setConfig(c => ({
                        ...c,
                        businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, defaultValidityDays: e.target.value === '' ? undefined : Number(e.target.value) } },
                      }))}
                      placeholder="30 jours"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Acompte demandé (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={config.businessConfig.quoteSettings.defaultDepositPercent ?? ''}
                      onChange={e => setConfig(c => ({
                        ...c,
                        businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, defaultDepositPercent: e.target.value === '' ? null : Number(e.target.value) } },
                      }))}
                      placeholder="30 %"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Délai estimatif par défaut</label>
                    <input
                      value={config.businessConfig.quoteSettings.defaultEstimatedDelay || ''}
                      onChange={e => setConfig(c => ({
                        ...c,
                        businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, defaultEstimatedDelay: e.target.value } },
                      }))}
                      placeholder="Sous réserve de disponibilité des fournitures."
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Conditions de paiement par défaut</label>
                  <input
                    value={config.businessConfig.quoteSettings.defaultPaymentTerms || ''}
                    onChange={e => setConfig(c => ({
                      ...c,
                      businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, defaultPaymentTerms: e.target.value } },
                    }))}
                    placeholder="Paiement à réception de facture."
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Notes / mentions par défaut</label>
                  <input
                    value={config.businessConfig.quoteSettings.defaultNotes || ''}
                    onChange={e => setConfig(c => ({
                      ...c,
                      businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, defaultNotes: e.target.value } },
                    }))}
                    placeholder="Prix valable selon les informations transmises."
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={labelStyle}>Régime de TVA des devis</label>
                    <select
                      value={config.businessConfig.quoteSettings.vatMode || 'vat_applicable'}
                      onChange={e => setConfig(c => ({
                        ...c,
                        businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, vatMode: e.target.value as 'vat_applicable' | 'vat_exempt_293b' } },
                      }))}
                      style={inputStyle}
                    >
                      <option value="vat_applicable">TVA applicable</option>
                      <option value="vat_exempt_293b">Franchise en base de TVA (art. 293 B du CGI)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Le devis est-il facturé ?</label>
                    <select
                      value={config.businessConfig.quoteSettings.quotePricingType || 'free'}
                      onChange={e => setConfig(c => ({
                        ...c,
                        businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, quotePricingType: e.target.value as 'free' | 'paid' } },
                      }))}
                      style={inputStyle}
                    >
                      <option value="free">Devis gratuit</option>
                      <option value="paid">Devis payant</option>
                    </select>
                  </div>
                  {config.businessConfig.quoteSettings.quotePricingType === 'paid' && (
                    <>
                      <div>
                        <label style={labelStyle}>Montant du devis (€ TTC)</label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={config.businessConfig.quoteSettings.quoteFeeAmountTTC ?? ''}
                          onChange={e => setConfig(c => ({
                            ...c,
                            businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, quoteFeeAmountTTC: e.target.value === '' ? null : Number(e.target.value) } },
                          }))}
                          placeholder="50"
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={checkboxRowStyle}>
                          <input
                            type="checkbox"
                            checked={!!config.businessConfig.quoteSettings.quoteFeeDeductible}
                            onChange={e => setConfig(c => ({
                              ...c,
                              businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, quoteFeeDeductible: e.target.checked } },
                            }))}
                          />
                          Déductible du montant des travaux si accepté
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Main-d&apos;œuvre</label>
                    <select
                      value={config.businessConfig.quoteSettings.laborMentionMode || 'not_applicable'}
                      onChange={e => setConfig(c => ({
                        ...c,
                        businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, laborMentionMode: e.target.value as 'included' | 'detailed' | 'not_applicable' } },
                      }))}
                      style={inputStyle}
                    >
                      <option value="not_applicable">Non applicable</option>
                      <option value="included">Incluse dans les prestations</option>
                      <option value="detailed">Détaillée dans les lignes du devis</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Frais de déplacement</label>
                    <select
                      value={config.businessConfig.quoteSettings.travelFeeMentionMode || 'not_applicable'}
                      onChange={e => setConfig(c => ({
                        ...c,
                        businessConfig: { ...c.businessConfig, quoteSettings: { ...c.businessConfig.quoteSettings, travelFeeMentionMode: e.target.value as 'included' | 'detailed' | 'not_charged' | 'not_applicable' } },
                      }))}
                      style={inputStyle}
                    >
                      <option value="not_applicable">Non applicable</option>
                      <option value="included">Inclus dans les prestations</option>
                      <option value="detailed">Détaillés dans les lignes du devis</option>
                      <option value="not_charged">Non facturés</option>
                    </select>
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
                          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '12px' }}>
                            {accountStatus.cancelAtPeriodEnd ? 'Fin d’accès le' : 'Renouvellement le'}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600 }}>{accountStatus.nextBilling}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      {accountStatus?.hasStripeCustomer ? (
                        <>
                          <button
                            onClick={openBillingPortal}
                            disabled={portalLoading}
                            style={{
                              background: 'var(--accent)',
                              border: 'none',
                              color: 'black',
                              fontWeight: 700,
                              borderRadius: '10px',
                              padding: '10px 20px',
                              fontSize: '14px',
                              cursor: portalLoading ? 'default' : 'pointer',
                              opacity: portalLoading ? 0.7 : 1,
                            }}
                          >
                            {portalLoading ? 'Redirection...' : 'Gérer mon abonnement'}
                          </button>
                          {portalError && (
                            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#ef4444' }}>{portalError}</p>
                          )}
                        </>
                      ) : (
                        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '13px' }}>
                          Aucun abonnement Stripe actif
                        </p>
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
