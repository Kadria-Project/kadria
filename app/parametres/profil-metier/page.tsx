'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import { TradeSearchSelect } from '@/src/components/TradeSearchSelect'
import { ARTISAN_TRADES } from '@/src/config/trades'
import { SERVICE_PROFILE_TRADES, SERVICE_PROFILE_TEMPLATES, serviceProfileTemplateToPayload } from '@/src/lib/service-profile-templates'
import { BusinessSetupWizard } from '@/src/components/BusinessSetupWizard'
import { computeProgressRecommendations, type ProgressRecommendations } from '@/src/lib/progression-engine'
import LoadingForm from '@/src/components/ui/loading/LoadingForm'
import type { QualificationField, QualificationFieldType } from '@/src/lib/qualification-fields'

interface BusinessProfile {
  primaryTrade: string
  coveredTrades: string[]
  specialties: string[]
  excludedServices: string[]
  baseCity: string
  interventionRadiusKm: string
  travelFeeHt: string
  travelFeePerKm: string
  workingDays: string[]
  workStartTime: string
  workEndTime: string
  urgentAvailable: boolean
  defaultVatRate: string
  hourlyRateHt: string
  diagnosticFeeHt: string
  defaultMarginPercent: string
  paymentTerms: string
  preferredBrands: string[]
  avoidedBrands: string[]
  internalNotes: string
}

interface CatalogItem {
  id: string
  name: string
  category: string | null
  price_ht: number | null
  unit: string | null
  estimated_duration_minutes: number | null
  vat_rate: number | null
  is_active: boolean
}

interface ServicePhotoRequirement {
  id: string
  title: string
  description: string
  required: boolean
  order: number
}

interface ServiceProfileRow {
  id: string
  service_catalog_id: string | null
  name: string
  category: string | null
  description: string | null
  is_active: boolean
  detection_keywords: string[]
  qualification_questions: string[]
  qualification_fields: QualificationField[]
  required_information: string[]
  required_photos: boolean
  required_photos_list: ServicePhotoRequirement[]
  recommended_quote_lines: Array<{ label?: string; unitPriceHT?: number | null; vatRate?: number | null }>
  average_duration_minutes: number | null
  default_vat_rate: number | null
  travel_required: boolean
  appointment_recommended: boolean
  emergency_supported: boolean
  related_services: string[]
  internal_notes: string | null
}

interface ServiceProfileForm {
  name: string
  category: string
  description: string
  isActive: boolean
  serviceCatalogId: string
  detectionKeywords: string[]
  qualificationQuestions: string[]
  qualificationFields: QualificationField[]
  requiredInformation: string[]
  requiredPhotos: boolean
  requiredPhotosList: ServicePhotoRequirement[]
  recommendedQuoteLines: Array<{ label: string; unitPriceHT: string; vatRate: string }>
  averageDurationMinutes: string
  defaultVatRate: string
  travelRequired: boolean
  appointmentRecommended: boolean
  emergencySupported: boolean
  relatedServices: string[]
  internalNotes: string
}

type ServiceProfileBadgeTone = 'photos' | 'appointment' | 'emergency' | 'travel' | 'default'

const EMPTY_SERVICE_PROFILE_FORM: ServiceProfileForm = {
  name: '',
  category: '',
  description: '',
  isActive: true,
  serviceCatalogId: '',
  detectionKeywords: [],
  qualificationQuestions: [],
  qualificationFields: [],
  requiredInformation: [],
  requiredPhotos: false,
  requiredPhotosList: [],
  recommendedQuoteLines: [],
  averageDurationMinutes: '',
  defaultVatRate: '',
  travelRequired: false,
  appointmentRecommended: false,
  emergencySupported: false,
  relatedServices: [],
  internalNotes: '',
}

function getServiceProfileBadgeTone(label: string): ServiceProfileBadgeTone {
  if (label.includes('photo')) return 'photos'
  if (label.includes('RDV')) return 'appointment'
  if (label.includes('Urgence')) return 'emergency'
  if (label.includes('Déplacement')) return 'travel'
  return 'default'
}

function TradeMultiSearchSelect({
  options,
  values,
  onAdd,
  onRemove,
  placeholder,
  inputStyle,
  labelFor,
}: {
  options: { value: string; label: string }[]
  values: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
  placeholder: string
  inputStyle: React.CSSProperties
  labelFor: (value: string) => string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const available = options.filter((o) => !values.includes(o.value))
  const filtered = query.trim()
    ? available.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : available

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          style={inputStyle}
        />
        {open && filtered.length > 0 && (
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px',
              maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            {filtered.map((o) => (
              <div
                key={o.value}
                onMouseDown={(e) => { e.preventDefault(); onAdd(o.value); setQuery(''); setOpen(false) }}
                style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-1)' }}
              >
                {o.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {values.map((v) => (
            <span
              key={v}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                color: '#4ade80', borderRadius: '999px', padding: '4px 6px 4px 10px', fontSize: '12px', fontWeight: 600,
              }}
            >
              {labelFor(v)}
              <button
                type="button"
                onClick={() => onRemove(v)}
                style={{
                  background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer',
                  fontSize: '13px', lineHeight: 1, padding: '2px',
                }}
                aria-label={`Retirer ${labelFor(v)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function newPhotoRequirementId(): string {
  return `photo_${Math.random().toString(36).slice(2, 10)}`
}

function newQualificationFieldId(): string {
  return `field_${Math.random().toString(36).slice(2, 10)}`
}

const QUALIFICATION_FIELD_TYPE_OPTIONS: Array<{ value: QualificationFieldType; label: string }> = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'boolean', label: 'Oui/Non' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Choix' },
  { value: 'multiselect', label: 'Choix multiples' },
  { value: 'photo', label: 'Photo' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Adresse' },
  { value: 'currency', label: 'Monétaire' },
]

function serviceProfileFormFromRow(row: ServiceProfileRow): ServiceProfileForm {
  return {
    name: row.name,
    category: row.category || '',
    description: row.description || '',
    isActive: row.is_active,
    serviceCatalogId: row.service_catalog_id || '',
    detectionKeywords: row.detection_keywords || [],
    qualificationQuestions: row.qualification_questions || [],
    qualificationFields: (row.qualification_fields || []).slice().sort((a, b) => a.order - b.order),
    requiredInformation: row.required_information || [],
    requiredPhotos: row.required_photos,
    requiredPhotosList: (row.required_photos_list || []).slice().sort((a, b) => a.order - b.order),
    recommendedQuoteLines: (row.recommended_quote_lines || []).map((l) => ({
      label: l.label || '',
      unitPriceHT: l.unitPriceHT != null ? String(l.unitPriceHT) : '',
      vatRate: l.vatRate != null ? String(l.vatRate) : '',
    })),
    averageDurationMinutes: row.average_duration_minutes != null ? String(row.average_duration_minutes) : '',
    defaultVatRate: row.default_vat_rate != null ? String(row.default_vat_rate) : '',
    travelRequired: row.travel_required,
    appointmentRecommended: row.appointment_recommended,
    emergencySupported: row.emergency_supported,
    relatedServices: row.related_services || [],
    internalNotes: row.internal_notes || '',
  }
}

const EMPTY_PROFILE: BusinessProfile = {
  primaryTrade: '',
  coveredTrades: [],
  specialties: [],
  excludedServices: [],
  baseCity: '',
  interventionRadiusKm: '',
  travelFeeHt: '',
  travelFeePerKm: '',
  workingDays: [],
  workStartTime: '',
  workEndTime: '',
  urgentAvailable: false,
  defaultVatRate: '',
  hourlyRateHt: '',
  diagnosticFeeHt: '',
  defaultMarginPercent: '',
  paymentTerms: '',
  preferredBrands: [],
  avoidedBrands: [],
  internalNotes: '',
}

const WEEK_DAYS = [
  { value: 'lundi', label: 'Lun' },
  { value: 'mardi', label: 'Mar' },
  { value: 'mercredi', label: 'Mer' },
  { value: 'jeudi', label: 'Jeu' },
  { value: 'vendredi', label: 'Ven' },
  { value: 'samedi', label: 'Sam' },
  { value: 'dimanche', label: 'Dim' },
]

function profileFromRow(row: Record<string, unknown> | null): BusinessProfile {
  if (!row) return { ...EMPTY_PROFILE }
  const asNum = (v: unknown) => (typeof v === 'number' ? String(v) : '')
  const asStrArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return {
    primaryTrade: typeof row.primary_trade === 'string' ? row.primary_trade : '',
    coveredTrades: asStrArr(row.covered_trades),
    specialties: asStrArr(row.specialties),
    excludedServices: asStrArr(row.excluded_services),
    baseCity: typeof row.base_city === 'string' ? row.base_city : '',
    interventionRadiusKm: asNum(row.intervention_radius_km),
    travelFeeHt: asNum(row.travel_fee_ht),
    travelFeePerKm: asNum(row.travel_fee_per_km),
    workingDays: asStrArr(row.working_days),
    workStartTime: typeof row.work_start_time === 'string' ? row.work_start_time : '',
    workEndTime: typeof row.work_end_time === 'string' ? row.work_end_time : '',
    urgentAvailable: !!row.urgent_available,
    defaultVatRate: asNum(row.default_vat_rate),
    hourlyRateHt: asNum(row.hourly_rate_ht),
    diagnosticFeeHt: asNum(row.diagnostic_fee_ht),
    defaultMarginPercent: asNum(row.default_margin_percent),
    paymentTerms: typeof row.payment_terms === 'string' ? row.payment_terms : '',
    preferredBrands: asStrArr(row.preferred_brands),
    avoidedBrands: asStrArr(row.avoided_brands),
    internalNotes: typeof row.internal_notes === 'string' ? row.internal_notes : '',
  }
}

function toCsv(values: string[]): string {
  return values.join(', ')
}

function fromCsv(text: string): string[] {
  return text.split(',').map((v) => v.trim()).filter(Boolean)
}

function toNumberOrNull(text: string): number | null {
  if (!text.trim()) return null
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function ProfilMetierPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)
  const [profile, setProfile] = useState<BusinessProfile>({ ...EMPTY_PROFILE })
  // Texte brut des champs "séparés par des virgules" : on ne dérive PAS
  // l'affichage depuis toCsv(profile.specialties) à chaque frappe, sinon le
  // round-trip toCsv -> fromCsv supprime immédiatement la virgule tapée
  // (segment vide filtré par fromCsv) avant même que l'utilisateur puisse
  // taper le mot suivant. Resynchronisé uniquement quand `profile` est
  // remplacé depuis le serveur (chargement, sauvegarde, wizard).
  const [specialtiesText, setSpecialtiesText] = useState('')
  const [excludedServicesText, setExcludedServicesText] = useState('')
  const [otherTrade, setOtherTrade] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogError, setCatalogError] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: '', priceHt: '', unit: '', durationMinutes: '', vatRate: '' })

  const [serviceProfiles, setServiceProfiles] = useState<ServiceProfileRow[]>([])
  const [serviceProfilesUnavailable, setServiceProfilesUnavailable] = useState(false)
  const [serviceProfileError, setServiceProfileError] = useState('')
  const [editingServiceProfile, setEditingServiceProfile] = useState<ServiceProfileRow | 'new' | null>(null)
  const [serviceProfileForm, setServiceProfileForm] = useState<ServiceProfileForm>({ ...EMPTY_SERVICE_PROFILE_FORM })
  const [savingServiceProfile, setSavingServiceProfile] = useState(false)
  const [openServiceProfileSections, setOpenServiceProfileSections] = useState<Set<string>>(new Set(['presentation']))

  const [showWizard, setShowWizard] = useState(false)
  // Snapshots des données externes (calendrier, coordonnées entreprise) qui
  // entrent dans le calcul de progression mais ne sont pas édités sur cette
  // page : on les garde en state pour que le % reste recalculable en direct.
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [artisanConfigSnapshot, setArtisanConfigSnapshot] = useState<{
    companyName?: string | null
    phone?: string | null
    villePro?: string | null
    address?: string | null
  } | null>(null)
  // Le % de progression doit refléter l'état React courant immédiatement
  // (pas d'attente d'un refresh/retour API) : calcul dérivé à chaque rendu,
  // jamais figé dans un state mis à jour une seule fois au chargement.
  const progressRecommendations: ProgressRecommendations = useMemo(
    () =>
      computeProgressRecommendations({
        businessProfile: profile,
        serviceProfiles,
        calendarIntegration: { connected: calendarConnected },
        artisanConfig: artisanConfigSnapshot,
      }),
    [profile, serviceProfiles, calendarConnected, artisanConfigSnapshot]
  )
  const [moduleSaving, setModuleSaving] = useState<Record<string, boolean>>({})
  const [moduleSaved, setModuleSaved] = useState<Record<string, boolean>>({})
  const [moduleError, setModuleError] = useState<Record<string, string>>({})

  const [templateTrade, setTemplateTrade] = useState(SERVICE_PROFILE_TRADES[0].value)
  const [selectedTemplateNames, setSelectedTemplateNames] = useState<Set<string>>(new Set())
  const [importingTemplates, setImportingTemplates] = useState(false)
  const [templateImportMessage, setTemplateImportMessage] = useState('')

  function toggleTemplateSelection(name: string) {
    setSelectedTemplateNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function importSelectedTemplates() {
    const templates = (SERVICE_PROFILE_TEMPLATES[templateTrade] || []).filter((t) => selectedTemplateNames.has(t.name))
    if (templates.length === 0) return
    setImportingTemplates(true)
    setTemplateImportMessage('')
    try {
      const existingNames = new Set(serviceProfiles.map((sp) => sp.name.trim().toLowerCase()))
      const imported: ServiceProfileRow[] = []
      const skipped: string[] = []
      for (const template of templates) {
        if (existingNames.has(template.name.trim().toLowerCase())) {
          skipped.push(template.name)
          continue
        }
        const res = await fetch('/api/artisan/service-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceProfileTemplateToPayload(template)),
        })
        const data = await res.json()
        if (data.success && data.profile) {
          imported.push(data.profile)
          existingNames.add(template.name.trim().toLowerCase())
        } else {
          skipped.push(template.name)
        }
      }
      if (imported.length > 0) {
        setServiceProfiles((prev) => [...prev, ...imported])
      }
      setSelectedTemplateNames(new Set())
      const parts: string[] = []
      if (imported.length > 0) parts.push(`${imported.length} prestation${imported.length > 1 ? 's' : ''} importée${imported.length > 1 ? 's' : ''}`)
      if (skipped.length > 0) parts.push(`${skipped.length} ignorée${skipped.length > 1 ? 's' : ''} (déjà existante${skipped.length > 1 ? 's' : ''})`)
      setTemplateImportMessage(parts.join(' · ') || 'Aucune prestation importée.')
    } finally {
      setImportingTemplates(false)
    }
  }

  function toggleServiceProfileSection(key: string) {
    setOpenServiceProfileSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profileRes, catalogRes, serviceProfilesRes, calendarRes, configRes] = await Promise.all([
          fetch('/api/artisan/business-profile').then((r) => r.json()),
          fetch('/api/artisan/service-catalog').then((r) => r.json()),
          fetch('/api/artisan/service-profiles').then((r) => r.json()),
          fetch('/api/integrations/google-calendar/status').then((r) => r.json()).catch(() => null),
          fetch('/api/artisan/config').then((r) => r.json()).catch(() => null),
        ])
        if (cancelled) return
        if (profileRes.success) {
          const nextProfile = profileFromRow(profileRes.profile)
          setProfile(nextProfile)
          setSpecialtiesText(toCsv(nextProfile.specialties))
          setExcludedServicesText(toCsv(nextProfile.excludedServices))
          setHasProfile(!!profileRes.profile)
        }
        if (catalogRes.success) {
          setCatalog(catalogRes.items || [])
        }
        if (serviceProfilesRes.success) {
          setServiceProfiles(serviceProfilesRes.profiles || [])
          setServiceProfilesUnavailable(false)
        } else {
          setServiceProfilesUnavailable(true)
        }
        setCalendarConnected(!!calendarRes?.success && !!calendarRes.connected)
        setArtisanConfigSnapshot(configRes?.success ? configRes.config : null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function openNewServiceProfile() {
    setServiceProfileForm({ ...EMPTY_SERVICE_PROFILE_FORM })
    setOpenServiceProfileSections(new Set(['presentation']))
    setServiceProfileError('')
    setEditingServiceProfile('new')
  }

  function openServiceProfileEditor(row: ServiceProfileRow) {
    setServiceProfileForm(serviceProfileFormFromRow(row))
    setOpenServiceProfileSections(new Set(['presentation']))
    setServiceProfileError('')
    setEditingServiceProfile(row)
  }

  function buildServiceProfilePayload() {
    return {
      name: serviceProfileForm.name.trim(),
      category: serviceProfileForm.category.trim() || null,
      description: serviceProfileForm.description.trim() || null,
      isActive: serviceProfileForm.isActive,
      serviceCatalogId: serviceProfileForm.serviceCatalogId || null,
      detectionKeywords: serviceProfileForm.detectionKeywords,
      qualificationQuestions: serviceProfileForm.qualificationQuestions,
      qualificationFields: serviceProfileForm.qualificationFields
        .filter((f) => f.label.trim())
        .map((f, idx) => ({ ...f, label: f.label.trim(), order: idx })),
      requiredInformation: serviceProfileForm.requiredInformation,
      requiredPhotos: serviceProfileForm.requiredPhotos,
      requiredPhotosList: serviceProfileForm.requiredPhotosList
        .filter((p) => p.title.trim())
        .map((p, idx) => ({ ...p, title: p.title.trim(), order: idx })),
      recommendedQuoteLines: serviceProfileForm.recommendedQuoteLines
        .filter((l) => l.label.trim())
        .map((l) => ({
          label: l.label.trim(),
          unitPriceHT: toNumberOrNull(l.unitPriceHT),
          vatRate: toNumberOrNull(l.vatRate),
        })),
      averageDurationMinutes: serviceProfileForm.averageDurationMinutes.trim() ? Number(serviceProfileForm.averageDurationMinutes) : null,
      defaultVatRate: toNumberOrNull(serviceProfileForm.defaultVatRate),
      travelRequired: serviceProfileForm.travelRequired,
      appointmentRecommended: serviceProfileForm.appointmentRecommended,
      emergencySupported: serviceProfileForm.emergencySupported,
      relatedServices: serviceProfileForm.relatedServices,
      internalNotes: serviceProfileForm.internalNotes.trim() || null,
    }
  }

  async function saveServiceProfile() {
    if (!serviceProfileForm.name.trim()) {
      setServiceProfileError('Le nom de la prestation est requis')
      return
    }
    setSavingServiceProfile(true)
    setServiceProfileError('')
    try {
      const isNew = editingServiceProfile === 'new'
      const url = isNew ? '/api/artisan/service-profiles' : `/api/artisan/service-profiles/${(editingServiceProfile as ServiceProfileRow).id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildServiceProfilePayload()),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur lors de la sauvegarde')
      setServiceProfiles((prev) => (isNew ? [...prev, data.profile] : prev.map((p) => (p.id === data.profile.id ? data.profile : p))))
      setEditingServiceProfile(null)
    } catch (err) {
      setServiceProfileError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSavingServiceProfile(false)
    }
  }

  async function toggleServiceProfileActive(row: ServiceProfileRow) {
    try {
      const res = await fetch(`/api/artisan/service-profiles/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !row.is_active }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur')
      setServiceProfiles((prev) => prev.map((p) => (p.id === row.id ? data.profile : p)))
    } catch (err) {
      setServiceProfileError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  // Sauvegarde un sous-ensemble de champs (un "module" de la page) via le
  // PATCH existant, qui n'applique que les clés présentes dans le body :
  // les autres champs du profil ne sont jamais touchés ni réinitialisés.
  async function saveModule(moduleKey: string, fields: Record<string, unknown>) {
    setModuleSaving((m) => ({ ...m, [moduleKey]: true }))
    setModuleError((m) => ({ ...m, [moduleKey]: '' }))
    try {
      const res = await fetch('/api/artisan/business-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur lors de la sauvegarde')
      const savedProfile = profileFromRow(data.profile)
      setProfile(savedProfile)
      setSpecialtiesText(toCsv(savedProfile.specialties))
      setExcludedServicesText(toCsv(savedProfile.excludedServices))
      setHasProfile(true)
      setModuleSaved((m) => ({ ...m, [moduleKey]: true }))
      setTimeout(() => setModuleSaved((m) => ({ ...m, [moduleKey]: false })), 2000)
    } catch (err) {
      setModuleError((m) => ({ ...m, [moduleKey]: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde' }))
    } finally {
      setModuleSaving((m) => ({ ...m, [moduleKey]: false }))
    }
  }

  function getEffectivePrimaryTrade(): string {
    return profile.primaryTrade === 'autre' && otherTrade.trim() ? otherTrade.trim() : profile.primaryTrade
  }

  // Les métiers secondaires ne doivent jamais contenir le métier principal
  // (résolu, donc après substitution "autre" -> texte libre) ni 'autre' lui-
  // même (pas de sens en tant que domaine complémentaire). Appliqué en
  // continu : si le métier principal change pour une valeur déjà présente
  // dans coveredTrades, elle est retirée automatiquement.
  function setPrimaryTrade(nextValue: string) {
    setProfile((p) => ({
      ...p,
      primaryTrade: nextValue,
      coveredTrades: p.coveredTrades.filter((t) => t !== nextValue && t !== 'autre'),
    }))
  }

  function addCoveredTrade(value: string) {
    if (!value || value === 'autre') return
    setProfile((p) => {
      if (p.primaryTrade === value || p.coveredTrades.includes(value)) return p
      return { ...p, coveredTrades: [...p.coveredTrades, value] }
    })
  }

  function removeCoveredTrade(value: string) {
    setProfile((p) => ({ ...p, coveredTrades: p.coveredTrades.filter((t) => t !== value) }))
  }

  function reportUnknownTradeIfNeeded() {
    if (profile.primaryTrade === 'autre' && otherTrade.trim()) {
      fetch('/api/artisan/unknown-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeName: otherTrade.trim(), specialties: profile.specialties }),
      }).catch((err) => console.error('[UNKNOWN TRADE POST]', err))
    }
  }

  function saveIdentiteModule() {
    reportUnknownTradeIfNeeded()
    const effectivePrimaryTrade = getEffectivePrimaryTrade()
    return saveModule('identite', {
      primaryTrade: effectivePrimaryTrade,
      coveredTrades: profile.coveredTrades.filter((t) => t !== effectivePrimaryTrade && t !== 'autre'),
      specialties: profile.specialties,
      excludedServices: profile.excludedServices,
    })
  }

  function saveZoneModule() {
    return saveModule('zone', {
      baseCity: profile.baseCity,
      interventionRadiusKm: toNumberOrNull(profile.interventionRadiusKm),
      travelFeeHt: toNumberOrNull(profile.travelFeeHt),
      travelFeePerKm: toNumberOrNull(profile.travelFeePerKm),
    })
  }

  function saveHorairesModule() {
    return saveModule('horaires', {
      workingDays: profile.workingDays,
      workStartTime: profile.workStartTime,
      workEndTime: profile.workEndTime,
      urgentAvailable: profile.urgentAvailable,
    })
  }

  function saveChiffrageModule() {
    return saveModule('chiffrage', {
      defaultVatRate: toNumberOrNull(profile.defaultVatRate),
      hourlyRateHt: toNumberOrNull(profile.hourlyRateHt),
      diagnosticFeeHt: toNumberOrNull(profile.diagnosticFeeHt),
      defaultMarginPercent: toNumberOrNull(profile.defaultMarginPercent),
      paymentTerms: profile.paymentTerms,
    })
  }

  function saveMarquesModule() {
    return saveModule('marques', {
      preferredBrands: profile.preferredBrands,
      avoidedBrands: profile.avoidedBrands,
      internalNotes: profile.internalNotes,
    })
  }

  function renderModuleSaveButton(moduleKey: string, onSave: () => void) {
    const isSaving = !!moduleSaving[moduleKey]
    const isSaved = !!moduleSaved[moduleKey]
    const error = moduleError[moduleKey]
    return (
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          style={{
            background: isSaved ? 'rgba(34,197,94,0.2)' : isSaving ? 'var(--bg-hover)' : 'var(--bg-hover)',
            border: isSaved ? '1px solid var(--accent)' : '1px solid var(--border)',
            color: isSaved ? '#4ade80' : isSaving ? 'var(--text-3)' : 'var(--text-1)',
            fontWeight: 600, borderRadius: '8px', padding: '7px 14px', fontSize: '12px',
            cursor: isSaving ? 'default' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {isSaved ? '✓ Module enregistré' : isSaving ? 'Enregistrement...' : 'Enregistrer ce module'}
        </button>
        {error && <span style={{ color: '#f87171', fontSize: '12px' }}>{error}</span>}
      </div>
    )
  }

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      reportUnknownTradeIfNeeded()
      const effectivePrimaryTrade = getEffectivePrimaryTrade()
      const res = await fetch('/api/artisan/business-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryTrade: effectivePrimaryTrade,
          coveredTrades: profile.coveredTrades.filter((t) => t !== effectivePrimaryTrade && t !== 'autre'),
          specialties: profile.specialties,
          excludedServices: profile.excludedServices,
          baseCity: profile.baseCity,
          interventionRadiusKm: toNumberOrNull(profile.interventionRadiusKm),
          travelFeeHt: toNumberOrNull(profile.travelFeeHt),
          travelFeePerKm: toNumberOrNull(profile.travelFeePerKm),
          workingDays: profile.workingDays,
          workStartTime: profile.workStartTime,
          workEndTime: profile.workEndTime,
          urgentAvailable: profile.urgentAvailable,
          defaultVatRate: toNumberOrNull(profile.defaultVatRate),
          hourlyRateHt: toNumberOrNull(profile.hourlyRateHt),
          diagnosticFeeHt: toNumberOrNull(profile.diagnosticFeeHt),
          defaultMarginPercent: toNumberOrNull(profile.defaultMarginPercent),
          paymentTerms: profile.paymentTerms,
          preferredBrands: profile.preferredBrands,
          avoidedBrands: profile.avoidedBrands,
          internalNotes: profile.internalNotes,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur lors de la sauvegarde')
      const savedProfile = profileFromRow(data.profile)
      setProfile(savedProfile)
      setSpecialtiesText(toCsv(savedProfile.specialties))
      setExcludedServicesText(toCsv(savedProfile.excludedServices))
      setHasProfile(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function addCatalogItem() {
    if (!newItem.name.trim()) {
      setCatalogError('Le nom de la prestation est requis')
      return
    }
    setAddingItem(true)
    setCatalogError('')
    try {
      const res = await fetch('/api/artisan/service-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name.trim(),
          category: newItem.category.trim() || null,
          priceHt: toNumberOrNull(newItem.priceHt),
          unit: newItem.unit.trim() || null,
          estimatedDurationMinutes: newItem.durationMinutes.trim() ? Number(newItem.durationMinutes) : null,
          vatRate: toNumberOrNull(newItem.vatRate),
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Erreur lors de l'ajout")
      setCatalog((prev) => [...prev, data.item])
      setNewItem({ name: '', category: '', priceHt: '', unit: '', durationMinutes: '', vatRate: '' })
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Erreur lors de l'ajout")
    } finally {
      setAddingItem(false)
    }
  }

  async function toggleCatalogItem(item: CatalogItem) {
    try {
      const res = await fetch(`/api/artisan/service-catalog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.is_active }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur')
      setCatalog((prev) => prev.map((i) => (i.id === item.id ? data.item : i)))
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
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

  const sectionCard: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: isMobile ? '16px' : '24px',
    marginBottom: '16px',
    minWidth: 0,
  }

  const fieldWrap: React.CSSProperties = { marginBottom: '14px' }

  const gridTwo: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: '14px',
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        padding: '24px', fontFamily: 'system-ui',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <LoadingForm fields={5} />
        </div>
      </div>
    )
  }

  return (
    <main className="dashboard-shell w-full max-w-full overflow-x-hidden" style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'system-ui, sans-serif',
      color: 'var(--text-1)',
      paddingBottom: '60px',
    }}>
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-8 sm:py-4" style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <button
            onClick={() => router.push('/parametres')}
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
                · Profil métier
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
          {saved ? '✓ Sauvegardé' : saving ? 'Sauvegarde...' : hasProfile ? 'Sauvegarder' : 'Créer le profil'}
        </button>
      </div>

      {saved && !saveError && (
        <div className="mx-3 mt-4 sm:mx-8" style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          color: '#4ade80',
          fontSize: '13px',
        }}>
          Profil métier enregistré. Les prochaines suggestions de devis utiliseront désormais ces informations.
        </div>
      )}

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

      <div className="mx-auto w-full max-w-full px-3 py-4 sm:px-6 sm:py-8" style={{ maxWidth: '760px' }}>
        {progressRecommendations && (
          <div style={{
            ...sectionCard,
            background: 'var(--bg-elevated)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
              <div>
                <div style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                  🚀 Centre de progression
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                  {progressRecommendations.globalMessage}
                </div>
              </div>
              <div style={{ color: 'var(--accent)', fontSize: '22px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                {progressRecommendations.progress.percent}%
              </div>
            </div>

            <div style={{ height: '6px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginBottom: progressRecommendations.progress.percent < 100 ? '8px' : 0 }}>
              <div style={{ height: '100%', width: `${progressRecommendations.progress.percent}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
            </div>

            {progressRecommendations.progress.percent < 100 && (
              <div style={{ color: 'var(--text-3)', fontSize: '12px', marginBottom: '14px' }}>
                Encore environ {progressRecommendations.estimatedCompletionTime} pour débloquer tout le potentiel de Kadria.
              </div>
            )}

            {progressRecommendations.progress.percent < 100 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {progressRecommendations.nextSteps.map((s) => (
                  <div
                    key={s.key}
                    style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px',
                      border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontSize: '16px' }}>{s.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600 }}>{s.title}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: '11px' }}>
                          {s.estimatedTime} · {s.benefits.map((b) => `✓ ${b}`).join(' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {progressRecommendations.progress.percent < 100 ? (
              <button
                onClick={() => setShowWizard(true)}
                style={{
                  background: 'var(--accent)', border: 'none', color: 'black', fontWeight: 700,
                  borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Configurer mon métier
              </button>
            ) : (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>✓ Profil métier</span>
                  <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>✓ Prestations</span>
                  <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>✓ Tarifs</span>
                  <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>✓ Agenda</span>
                </div>
                <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600 }}>
                  🎉 Votre entreprise est prête.
                </div>
              </div>
            )}
          </div>
        )}

        {!hasProfile && (
          <div style={{
            ...sectionCard,
            textAlign: 'center',
            border: '1px dashed var(--border)',
            background: 'var(--bg)',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🧰</div>
            <h3 style={{ color: 'var(--text-1)', fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>
              Aucun profil métier configuré
            </h3>
            <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
              Renseignez votre métier, votre zone d&apos;intervention et votre chiffrage pour que Kadria sache vous représenter fidèlement. Rien n&apos;est encore connecté au chat, au vocal ou aux devis.
            </p>
          </div>
        )}

        {/* 1. Identité métier */}
        <div style={sectionCard}>
          <h3 style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🪪 Profil métier
          </h3>
          <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 16px' }}>
            Définissez votre métier principal, vos domaines complémentaires et les prestations que Kadria doit qualifier.
          </p>
          <div style={fieldWrap}>
            <label style={labelStyle}>Métier principal</label>
            <TradeSearchSelect
              options={[...ARTISAN_TRADES.filter((t) => t.value !== 'autre'), { value: 'autre', label: 'Autre métier...' }]}
              value={profile.primaryTrade}
              onSelect={setPrimaryTrade}
              placeholder="Rechercher un métier..."
              inputStyle={inputStyle}
            />
          </div>
          {profile.primaryTrade === 'autre' && (
            <div style={fieldWrap}>
              <label style={labelStyle}>Quel est votre métier ?</label>
              <input
                type="text"
                value={otherTrade}
                onChange={(e) => setOtherTrade(e.target.value)}
                placeholder="Précisez votre métier"
                required
                style={inputStyle}
              />
            </div>
          )}
          <div style={fieldWrap}>
            <label style={labelStyle}>Métiers secondaires</label>
            <TradeMultiSearchSelect
              options={ARTISAN_TRADES.filter((t) => t.value !== 'autre' && t.value !== profile.primaryTrade)}
              values={profile.coveredTrades}
              onAdd={addCoveredTrade}
              onRemove={removeCoveredTrade}
              placeholder="Ajouter un domaine couvert..."
              inputStyle={inputStyle}
              labelFor={(v) => ARTISAN_TRADES.find((t) => t.value === v)?.label || v}
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Spécialités (séparées par des virgules)</label>
            <input
              type="text"
              value={specialtiesText}
              onChange={(e) => {
                setSpecialtiesText(e.target.value)
                setProfile((p) => ({ ...p, specialties: fromCsv(e.target.value) }))
              }}
              placeholder="Ex : pompe à chaleur, climatisation réversible"
              style={inputStyle}
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Prestations exclues (séparées par des virgules)</label>
            <input
              type="text"
              value={excludedServicesText}
              onChange={(e) => {
                setExcludedServicesText(e.target.value)
                setProfile((p) => ({ ...p, excludedServices: fromCsv(e.target.value) }))
              }}
              placeholder="Ex : dépannage chaudière fioul"
              style={inputStyle}
            />
          </div>
          {renderModuleSaveButton('identite', saveIdentiteModule)}
        </div>

        {/* 2. Zone d'intervention */}
        <div style={sectionCard}>
          <h3 style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            📍 Zone d&apos;intervention
          </h3>
          <div style={gridTwo}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Ville de départ</label>
              <input
                type="text"
                value={profile.baseCity}
                onChange={(e) => setProfile((p) => ({ ...p, baseCity: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Rayon (km)</label>
              <input
                type="number"
                value={profile.interventionRadiusKm}
                onChange={(e) => setProfile((p) => ({ ...p, interventionRadiusKm: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Frais de déplacement HT (€)</label>
              <input
                type="number"
                value={profile.travelFeeHt}
                onChange={(e) => setProfile((p) => ({ ...p, travelFeeHt: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Frais au km (optionnel, €/km)</label>
              <input
                type="number"
                value={profile.travelFeePerKm}
                onChange={(e) => setProfile((p) => ({ ...p, travelFeePerKm: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          {renderModuleSaveButton('zone', saveZoneModule)}
        </div>

        {/* 3. Horaires */}
        <div style={sectionCard}>
          <h3 style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🕒 Horaires
          </h3>
          <div style={fieldWrap}>
            <label style={labelStyle}>Jours travaillés</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {WEEK_DAYS.map((d) => {
                const active = profile.workingDays.includes(d.value)
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setProfile((p) => ({
                      ...p,
                      workingDays: active ? p.workingDays.filter((v) => v !== d.value) : [...p.workingDays, d.value],
                    }))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: active ? 'rgba(34,197,94,0.12)' : 'var(--bg-hover)',
                      color: active ? '#4ade80' : 'var(--text-2)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={gridTwo}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Heure de début</label>
              <input
                type="time"
                value={profile.workStartTime}
                onChange={(e) => setProfile((p) => ({ ...p, workStartTime: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Heure de fin</label>
              <input
                type="time"
                value={profile.workEndTime}
                onChange={(e) => setProfile((p) => ({ ...p, workEndTime: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={profile.urgentAvailable}
              onChange={(e) => setProfile((p) => ({ ...p, urgentAvailable: e.target.checked }))}
            />
            J&apos;accepte les urgences
          </label>
          {renderModuleSaveButton('horaires', saveHorairesModule)}
        </div>

        {/* 4. Chiffrage */}
        <div style={sectionCard}>
          <h3 style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            💶 Chiffrage
          </h3>
          <div style={gridTwo}>
            <div style={fieldWrap}>
              <label style={labelStyle}>TVA par défaut (%)</label>
              <input
                type="number"
                value={profile.defaultVatRate}
                onChange={(e) => setProfile((p) => ({ ...p, defaultVatRate: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Tarif horaire HT (€)</label>
              <input
                type="number"
                value={profile.hourlyRateHt}
                onChange={(e) => setProfile((p) => ({ ...p, hourlyRateHt: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Forfait diagnostic (€)</label>
              <input
                type="number"
                value={profile.diagnosticFeeHt}
                onChange={(e) => setProfile((p) => ({ ...p, diagnosticFeeHt: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Marge par défaut (%)</label>
              <input
                type="number"
                value={profile.defaultMarginPercent}
                onChange={(e) => setProfile((p) => ({ ...p, defaultMarginPercent: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Conditions de paiement</label>
            <textarea
              value={profile.paymentTerms}
              onChange={(e) => setProfile((p) => ({ ...p, paymentTerms: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Ex : 30% à la commande, solde à la livraison"
            />
          </div>
          {renderModuleSaveButton('chiffrage', saveChiffrageModule)}
        </div>

        {/* 5. Marques / préférences */}
        <div style={sectionCard}>
          <h3 style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🏷️ Marques / préférences
          </h3>
          <div style={fieldWrap}>
            <label style={labelStyle}>Marques installées (séparées par des virgules)</label>
            <input
              type="text"
              value={toCsv(profile.preferredBrands)}
              onChange={(e) => setProfile((p) => ({ ...p, preferredBrands: fromCsv(e.target.value) }))}
              style={inputStyle}
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Marques évitées (séparées par des virgules)</label>
            <input
              type="text"
              value={toCsv(profile.avoidedBrands)}
              onChange={(e) => setProfile((p) => ({ ...p, avoidedBrands: fromCsv(e.target.value) }))}
              style={inputStyle}
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Notes internes</label>
            <textarea
              value={profile.internalNotes}
              onChange={(e) => setProfile((p) => ({ ...p, internalNotes: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {renderModuleSaveButton('marques', saveMarquesModule)}
        </div>

        {/* 6. Catalogue simple de prestations */}
        <div style={sectionCard}>
          <h3 style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            📒 Catalogue de prestations
          </h3>

          {catalogError && (
            <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{catalogError}</div>
          )}

          {catalog.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '24px 12px',
              border: '1px dashed var(--border)', borderRadius: '12px',
              color: 'var(--text-3)', fontSize: '13px', marginBottom: '16px',
            }}>
              Aucune prestation dans le catalogue pour l&apos;instant. Ajoutez votre première prestation ci-dessous.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {catalog.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: item.is_active ? 'var(--bg-hover)' : 'var(--bg)',
                    opacity: item.is_active ? 1 : 0.55,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 600 }}>{item.name}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                      {[item.category, item.price_ht != null ? `${item.price_ht} € HT` : null, item.unit, item.estimated_duration_minutes ? `${item.estimated_duration_minutes} min` : null, item.vat_rate != null ? `TVA ${item.vat_rate}%` : null]
                        .filter(Boolean)
                        .join(' · ') || 'Sans détail'}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleCatalogItem(item)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: item.is_active ? '#f87171' : '#4ade80',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {item.is_active ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{
            border: '1px solid var(--border)', borderRadius: '12px',
            padding: '14px', background: 'var(--bg)',
          }}>
            <div style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ajouter une prestation
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Nom de la prestation"
                value={newItem.name}
                onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Catégorie"
                value={newItem.category}
                onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <input
                type="number"
                placeholder="Prix HT (€)"
                value={newItem.priceHt}
                onChange={(e) => setNewItem((p) => ({ ...p, priceHt: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Unité"
                value={newItem.unit}
                onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Durée (min)"
                value={newItem.durationMinutes}
                onChange={(e) => setNewItem((p) => ({ ...p, durationMinutes: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="TVA (%)"
                value={newItem.vatRate}
                onChange={(e) => setNewItem((p) => ({ ...p, vatRate: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <button
              onClick={addCatalogItem}
              disabled={addingItem}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                border: 'none', background: 'var(--accent)', color: 'black',
                fontWeight: 700, fontSize: '14px', cursor: addingItem ? 'default' : 'pointer',
              }}
            >
              {addingItem ? 'Ajout...' : '+ Ajouter au catalogue'}
            </button>
          </div>
        </div>

        {/* Bibliothèque de prestations (référentiel métier) */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🧩 Bibliothèque de prestations
            </h3>
            <button
              onClick={openNewServiceProfile}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: 'black', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              }}
            >
              + Nouvelle fiche
            </button>
          </div>

          <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 16px' }}>
            Décrivez comment chaque prestation doit être qualifiée, chiffrée et planifiée. Pas encore connecté au chat, au vocal, aux devis ou à l&apos;Action Engine.
          </p>

          <div style={{
            border: '1px solid var(--border)', borderRadius: '12px',
            padding: isMobile ? '14px' : '18px', marginBottom: '20px',
            background: 'var(--bg-hover)',
          }}>
            <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              🚀 Démarrer plus vite
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 14px' }}>
              Importez des modèles de prestations adaptés à votre métier, puis ajustez-les à votre façon de travailler.
            </p>

            <div style={fieldWrap}>
              <label style={labelStyle}>Métier</label>
              <select
                value={templateTrade}
                onChange={(e) => { setTemplateTrade(e.target.value); setSelectedTemplateNames(new Set()); setTemplateImportMessage('') }}
                style={inputStyle}
              >
                {SERVICE_PROFILE_TRADES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {(SERVICE_PROFILE_TEMPLATES[templateTrade] || []).map((t) => {
                const alreadyExists = serviceProfiles.some((sp) => sp.name.trim().toLowerCase() === t.name.trim().toLowerCase())
                return (
                  <label
                    key={t.name}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      padding: '8px 10px', borderRadius: '8px',
                      border: '1px solid var(--border)',
                      opacity: alreadyExists ? 0.5 : 1,
                      cursor: alreadyExists ? 'default' : 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTemplateNames.has(t.name)}
                      disabled={alreadyExists}
                      onChange={() => toggleTemplateSelection(t.name)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600 }}>
                        {t.name}{alreadyExists ? ' (déjà dans votre bibliothèque)' : ''}
                      </div>
                      <div style={{ color: 'var(--text-3)', fontSize: '11px' }}>{t.description}</div>
                    </div>
                  </label>
                )
              })}
            </div>

            {templateImportMessage && (
              <div style={{ color: 'var(--text-2)', fontSize: '12px', marginBottom: '10px' }}>{templateImportMessage}</div>
            )}

            <button
              onClick={importSelectedTemplates}
              disabled={importingTemplates || selectedTemplateNames.size === 0}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: 'black', fontWeight: 700, fontSize: '13px',
                cursor: importingTemplates || selectedTemplateNames.size === 0 ? 'not-allowed' : 'pointer',
                opacity: importingTemplates || selectedTemplateNames.size === 0 ? 0.6 : 1,
              }}
            >
              {importingTemplates ? 'Import en cours…' : 'Importer les prestations sélectionnées'}
            </button>
          </div>

          {serviceProfileError && (
            <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{serviceProfileError}</div>
          )}

          {serviceProfilesUnavailable ? (
            <div style={{
              textAlign: 'center', padding: '24px 12px',
              border: '1px dashed var(--border)', borderRadius: '12px',
              color: 'var(--text-3)', fontSize: '13px',
            }}>
              La bibliothèque de prestations n&apos;est pas encore disponible (migration Supabase non exécutée).
            </div>
          ) : serviceProfiles.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '28px 16px',
              border: '1px dashed var(--border)', borderRadius: '12px',
              color: 'var(--text-3)', fontSize: '13px',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
              Aucune fiche prestation pour l&apos;instant. Créez votre première fiche pour préciser comment une prestation doit être qualifiée et chiffrée.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '10px',
            }}>
              {serviceProfiles.map((sp) => {
                const linkedCatalogItem = sp.service_catalog_id ? catalog.find((c) => c.id === sp.service_catalog_id) : null
                const badges: string[] = []
                if (sp.required_photos_list && sp.required_photos_list.length > 0) {
                  badges.push(`📷 ${sp.required_photos_list.length} photo${sp.required_photos_list.length > 1 ? 's' : ''} à demander`)
                } else if (sp.required_photos) {
                  badges.push('📷 Photos requises')
                }
                if (sp.appointment_recommended) badges.push('📅 RDV conseillé')
                if (sp.emergency_supported) badges.push('🚨 Urgence possible')
                if (sp.travel_required) badges.push('🚐 Déplacement requis')
                return (
                  <div
                    key={sp.id}
                    className="service-profile-card"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '14px',
                      background: sp.is_active ? 'var(--bg-hover)' : 'var(--bg)',
                      opacity: sp.is_active ? 1 : 0.55,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div className="service-profile-card-title" style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 700 }}>{sp.name}</div>
                      <div className="service-profile-card-meta" style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                        {[sp.category, linkedCatalogItem?.price_ht != null ? `${linkedCatalogItem.price_ht} € HT` : null, linkedCatalogItem?.estimated_duration_minutes ? `${linkedCatalogItem.estimated_duration_minutes} min` : sp.average_duration_minutes ? `${sp.average_duration_minutes} min` : null]
                          .filter(Boolean)
                          .join(' · ') || 'Sans détail'}
                      </div>
                    </div>
                    {badges.length > 0 && (
                      <div className="service-profile-badges" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {badges.map((b) => (
                          <span
                            key={b}
                            className="service-profile-badge"
                            data-badge-tone={getServiceProfileBadgeTone(b)}
                            style={{
                              fontSize: '11px', padding: '3px 8px', borderRadius: '999px',
                              background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)',
                            }}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="service-profile-actions" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => openServiceProfileEditor(sp)}
                        className="service-profile-cta service-profile-cta-configure"
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px',
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text-1)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Configurer
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceProfileActive(sp)}
                        className={`service-profile-cta ${sp.is_active ? 'service-profile-cta-danger' : 'service-profile-cta-reactivate'}`}
                        style={{
                          padding: '8px 10px', borderRadius: '8px',
                          border: '1px solid var(--border)', background: 'transparent',
                          color: sp.is_active ? '#f87171' : '#4ade80', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {sp.is_active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {editingServiceProfile && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: isMobile ? '16px' : '24px',
            maxWidth: '600px', width: '100%', maxHeight: '88vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ color: 'var(--text-1)', fontSize: '16px', fontWeight: 700, margin: 0 }}>
                {editingServiceProfile === 'new' ? 'Nouvelle fiche prestation' : 'Configurer la prestation'}
              </h2>
              <button
                onClick={() => setEditingServiceProfile(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {serviceProfileError && (
              <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{serviceProfileError}</div>
            )}

            {/* 1. Présentation */}
            <ServiceProfileAccordion
              title="🪪 Présentation"
              sectionKey="presentation"
              open={openServiceProfileSections.has('presentation')}
              onToggle={toggleServiceProfileSection}
            >
              <div style={fieldWrap}>
                <label style={labelStyle}>Nom de la prestation</label>
                <input
                  type="text"
                  value={serviceProfileForm.name}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, name: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Catégorie</label>
                <input
                  type="text"
                  value={serviceProfileForm.category}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, category: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={serviceProfileForm.description}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Lier au catalogue (optionnel)</label>
                <select
                  value={serviceProfileForm.serviceCatalogId}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, serviceCatalogId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Aucune prestation liée</option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={serviceProfileForm.isActive}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Fiche active
              </label>
            </ServiceProfileAccordion>

            {/* 2. Détection */}
            <ServiceProfileAccordion
              title="🔍 Détection"
              sectionKey="detection"
              open={openServiceProfileSections.has('detection')}
              onToggle={toggleServiceProfileSection}
            >
              <div style={fieldWrap}>
                <label style={labelStyle}>Mots-clés de détection (séparés par des virgules)</label>
                <input
                  type="text"
                  value={toCsv(serviceProfileForm.detectionKeywords)}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, detectionKeywords: fromCsv(e.target.value) }))}
                  placeholder="Ex : fuite, robinet, chasse d'eau"
                  style={inputStyle}
                />
              </div>
            </ServiceProfileAccordion>

            {/* 3. Qualification */}
            <ServiceProfileAccordion
              title="❓ Qualification"
              sectionKey="qualification"
              open={openServiceProfileSections.has('qualification')}
              onToggle={toggleServiceProfileSection}
            >
              <div style={fieldWrap}>
                <label style={labelStyle}>Questions à poser (séparées par des virgules)</label>
                <textarea
                  value={toCsv(serviceProfileForm.qualificationQuestions)}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, qualificationQuestions: fromCsv(e.target.value) }))}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Questions de qualification structurées</label>
                <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: '0 0 8px' }}>
                  Tant qu&apos;aucune question structurée n&apos;est ajoutée ici, les questions ci-dessus (texte libre) restent utilisées.
                </p>
                {serviceProfileForm.qualificationFields.map((field, idx) => {
                  const needsOptions = field.type === 'select' || field.type === 'multiselect'
                  const needsUnit = field.type === 'number' || field.type === 'currency'
                  return (
                    <div
                      key={field.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Libellé (ex : Puissance compteur)"
                          value={field.label}
                          onChange={(e) => setServiceProfileForm((p) => ({
                            ...p,
                            qualificationFields: p.qualificationFields.map((f, i) => (i === idx ? { ...f, label: e.target.value } : f)),
                          }))}
                          style={inputStyle}
                        />
                        <select
                          value={field.type}
                          onChange={(e) => setServiceProfileForm((p) => ({
                            ...p,
                            qualificationFields: p.qualificationFields.map((f, i) => (i === idx ? { ...f, type: e.target.value as QualificationFieldType } : f)),
                          }))}
                          style={inputStyle}
                        >
                          {QUALIFICATION_FIELD_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: needsUnit || needsOptions ? '1fr 1fr' : '1fr', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Aide / placeholder (optionnel)"
                          value={field.helpText || ''}
                          onChange={(e) => setServiceProfileForm((p) => ({
                            ...p,
                            qualificationFields: p.qualificationFields.map((f, i) => (i === idx ? { ...f, helpText: e.target.value } : f)),
                          }))}
                          style={inputStyle}
                        />
                        {needsUnit && (
                          <input
                            type="text"
                            placeholder="Unité (ex : A, €)"
                            value={field.unit || ''}
                            onChange={(e) => setServiceProfileForm((p) => ({
                              ...p,
                              qualificationFields: p.qualificationFields.map((f, i) => (i === idx ? { ...f, unit: e.target.value } : f)),
                            }))}
                            style={inputStyle}
                          />
                        )}
                        {needsOptions && (
                          <input
                            type="text"
                            placeholder="Options (séparées par des virgules)"
                            value={toCsv(field.options || [])}
                            onChange={(e) => setServiceProfileForm((p) => ({
                              ...p,
                              qualificationFields: p.qualificationFields.map((f, i) => (i === idx ? { ...f, options: fromCsv(e.target.value) } : f)),
                            }))}
                            style={inputStyle}
                          />
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => setServiceProfileForm((p) => ({
                              ...p,
                              qualificationFields: p.qualificationFields.map((f, i) => (i === idx ? { ...f, required: e.target.checked } : f)),
                            }))}
                          />
                          Obligatoire
                        </label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => setServiceProfileForm((p) => {
                              const next = p.qualificationFields.slice()
                              ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                              return { ...p, qualificationFields: next }
                            })}
                            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-2)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1, padding: '2px 8px', fontSize: '12px' }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === serviceProfileForm.qualificationFields.length - 1}
                            onClick={() => setServiceProfileForm((p) => {
                              const next = p.qualificationFields.slice()
                              ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
                              return { ...p, qualificationFields: next }
                            })}
                            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-2)', cursor: idx === serviceProfileForm.qualificationFields.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === serviceProfileForm.qualificationFields.length - 1 ? 0.4 : 1, padding: '2px 8px', fontSize: '12px' }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiceProfileForm((p) => ({
                              ...p,
                              qualificationFields: p.qualificationFields.filter((_, i) => i !== idx),
                            }))}
                            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', padding: '2px 8px', fontSize: '12px' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setServiceProfileForm((p) => ({
                    ...p,
                    qualificationFields: [
                      ...p.qualificationFields,
                      { id: newQualificationFieldId(), label: '', type: 'text', required: true, order: p.qualificationFields.length },
                    ],
                  }))}
                  style={{
                    width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed var(--border)',
                    background: 'transparent', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  + Ajouter une question structurée
                </button>
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Informations indispensables (séparées par des virgules)</label>
                <textarea
                  value={toCsv(serviceProfileForm.requiredInformation)}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, requiredInformation: fromCsv(e.target.value) }))}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Photos à demander</label>
                {serviceProfileForm.requiredPhotosList.map((photo, idx) => (
                  <div
                    key={photo.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '10px',
                      marginBottom: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Titre (ex : Tableau électrique)"
                        value={photo.title}
                        onChange={(e) => setServiceProfileForm((p) => ({
                          ...p,
                          requiredPhotosList: p.requiredPhotosList.map((ph, i) => (i === idx ? { ...ph, title: e.target.value } : ph)),
                        }))}
                        style={inputStyle}
                      />
                      <input
                        type="text"
                        placeholder="Description (ex : Vue complète du tableau)"
                        value={photo.description}
                        onChange={(e) => setServiceProfileForm((p) => ({
                          ...p,
                          requiredPhotosList: p.requiredPhotosList.map((ph, i) => (i === idx ? { ...ph, description: e.target.value } : ph)),
                        }))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={photo.required}
                          onChange={(e) => setServiceProfileForm((p) => ({
                            ...p,
                            requiredPhotosList: p.requiredPhotosList.map((ph, i) => (i === idx ? { ...ph, required: e.target.checked } : ph)),
                          }))}
                        />
                        Obligatoire
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => setServiceProfileForm((p) => {
                            const next = p.requiredPhotosList.slice()
                            ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                            return { ...p, requiredPhotosList: next }
                          })}
                          style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-2)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1, padding: '2px 8px', fontSize: '12px' }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === serviceProfileForm.requiredPhotosList.length - 1}
                          onClick={() => setServiceProfileForm((p) => {
                            const next = p.requiredPhotosList.slice()
                            ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
                            return { ...p, requiredPhotosList: next }
                          })}
                          style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-2)', cursor: idx === serviceProfileForm.requiredPhotosList.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === serviceProfileForm.requiredPhotosList.length - 1 ? 0.4 : 1, padding: '2px 8px', fontSize: '12px' }}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => setServiceProfileForm((p) => ({
                            ...p,
                            requiredPhotosList: p.requiredPhotosList.filter((_, i) => i !== idx),
                          }))}
                          style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', padding: '2px 8px', fontSize: '12px' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setServiceProfileForm((p) => ({
                    ...p,
                    requiredPhotosList: [
                      ...p.requiredPhotosList,
                      { id: newPhotoRequirementId(), title: '', description: '', required: true, order: p.requiredPhotosList.length },
                    ],
                  }))}
                  style={{
                    width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed var(--border)',
                    background: 'transparent', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  + Ajouter une photo à demander
                </button>
                {serviceProfileForm.requiredPhotosList.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '6px 0 0' }}>
                    Aucune photo spécifique configurée pour cette prestation.
                  </p>
                )}
              </div>
            </ServiceProfileAccordion>

            {/* 4. Chiffrage */}
            <ServiceProfileAccordion
              title="💶 Chiffrage"
              sectionKey="chiffrage"
              open={openServiceProfileSections.has('chiffrage')}
              onToggle={toggleServiceProfileSection}
            >
              <div style={fieldWrap}>
                <label style={labelStyle}>Lignes de devis recommandées</label>
                {serviceProfileForm.recommendedQuoteLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      placeholder="Libellé"
                      value={line.label}
                      onChange={(e) => setServiceProfileForm((p) => ({
                        ...p,
                        recommendedQuoteLines: p.recommendedQuoteLines.map((l, i) => (i === idx ? { ...l, label: e.target.value } : l)),
                      }))}
                      style={inputStyle}
                    />
                    <input
                      type="number"
                      placeholder="Prix HT"
                      value={line.unitPriceHT}
                      onChange={(e) => setServiceProfileForm((p) => ({
                        ...p,
                        recommendedQuoteLines: p.recommendedQuoteLines.map((l, i) => (i === idx ? { ...l, unitPriceHT: e.target.value } : l)),
                      }))}
                      style={inputStyle}
                    />
                    <input
                      type="number"
                      placeholder="TVA %"
                      value={line.vatRate}
                      onChange={(e) => setServiceProfileForm((p) => ({
                        ...p,
                        recommendedQuoteLines: p.recommendedQuoteLines.map((l, i) => (i === idx ? { ...l, vatRate: e.target.value } : l)),
                      }))}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => setServiceProfileForm((p) => ({
                        ...p,
                        recommendedQuoteLines: p.recommendedQuoteLines.filter((_, i) => i !== idx),
                      }))}
                      style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', padding: '0 10px' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setServiceProfileForm((p) => ({
                    ...p,
                    recommendedQuoteLines: [...p.recommendedQuoteLines, { label: '', unitPriceHT: '', vatRate: '' }],
                  }))}
                  style={{
                    width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed var(--border)',
                    background: 'transparent', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  + Ajouter une ligne
                </button>
              </div>
              <div style={gridTwo}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Durée moyenne (min)</label>
                  <input
                    type="number"
                    value={serviceProfileForm.averageDurationMinutes}
                    onChange={(e) => setServiceProfileForm((p) => ({ ...p, averageDurationMinutes: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>TVA (%)</label>
                  <input
                    type="number"
                    value={serviceProfileForm.defaultVatRate}
                    onChange={(e) => setServiceProfileForm((p) => ({ ...p, defaultVatRate: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>
            </ServiceProfileAccordion>

            {/* 5. Planification */}
            <ServiceProfileAccordion
              title="🗓️ Planification"
              sectionKey="planification"
              open={openServiceProfileSections.has('planification')}
              onToggle={toggleServiceProfileSection}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={serviceProfileForm.appointmentRecommended}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, appointmentRecommended: e.target.checked }))}
                />
                Rendez-vous conseillé
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={serviceProfileForm.travelRequired}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, travelRequired: e.target.checked }))}
                />
                Déplacement nécessaire
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={serviceProfileForm.emergencySupported}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, emergencySupported: e.target.checked }))}
                />
                Urgence possible
              </label>
              <div style={{ ...fieldWrap, marginTop: '12px' }}>
                <label style={labelStyle}>Prestations liées (séparées par des virgules)</label>
                <input
                  type="text"
                  value={toCsv(serviceProfileForm.relatedServices)}
                  onChange={(e) => setServiceProfileForm((p) => ({ ...p, relatedServices: fromCsv(e.target.value) }))}
                  style={inputStyle}
                />
              </div>
            </ServiceProfileAccordion>

            {/* 6. Notes internes */}
            <ServiceProfileAccordion
              title="📝 Notes internes"
              sectionKey="notes"
              open={openServiceProfileSections.has('notes')}
              onToggle={toggleServiceProfileSection}
            >
              <textarea
                value={serviceProfileForm.internalNotes}
                onChange={(e) => setServiceProfileForm((p) => ({ ...p, internalNotes: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </ServiceProfileAccordion>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => setEditingServiceProfile(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-1)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={saveServiceProfile}
                disabled={savingServiceProfile}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: 'none', background: 'var(--accent)', color: 'black',
                  fontWeight: 700, fontSize: '14px', cursor: savingServiceProfile ? 'default' : 'pointer',
                }}
              >
                {savingServiceProfile ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWizard && (
        <BusinessSetupWizard
          existingServiceProfiles={serviceProfiles.map((sp) => ({ name: sp.name }))}
          onClose={() => setShowWizard(false)}
          onComplete={({ profile, importedServiceProfiles }) => {
            if (profile) {
              const nextProfile = profileFromRow(profile)
              setProfile(nextProfile)
              setSpecialtiesText(toCsv(nextProfile.specialties))
              setExcludedServicesText(toCsv(nextProfile.excludedServices))
              setHasProfile(true)
            }
            if (importedServiceProfiles.length > 0) {
              setServiceProfiles((prev) => [...prev, ...(importedServiceProfiles as unknown as ServiceProfileRow[])])
            }
          }}
        />
      )}
      <style jsx>{`
        .service-profile-card {
          transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
        }

        .service-profile-card:hover {
          transform: translateY(-1px);
        }

        .service-profile-card-title {
          letter-spacing: -0.01em;
        }

        .service-profile-card-meta {
          margin-top: 3px;
        }

        .service-profile-badge {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          line-height: 1.2;
          font-weight: 600;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .service-profile-actions {
          padding-top: 10px;
          border-top: 1px solid transparent;
        }

        .service-profile-cta {
          transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
        }

        .service-profile-cta:hover {
          transform: translateY(-1px);
        }

        .service-profile-cta:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
        }

        :global([data-theme="light"]) .service-profile-card {
          border-color: rgba(15, 23, 42, 0.1) !important;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96)) !important;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
        }

        :global([data-theme="light"]) .service-profile-card:hover {
          border-color: rgba(22, 163, 74, 0.2) !important;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
        }

        :global([data-theme="light"]) .service-profile-card-title {
          color: #111827 !important;
        }

        :global([data-theme="light"]) .service-profile-card-meta {
          color: #4b5563 !important;
        }

        :global([data-theme="light"]) .service-profile-actions {
          border-top-color: rgba(148, 163, 184, 0.24);
        }

        :global([data-theme="light"]) .service-profile-cta-configure {
          border-color: rgba(100, 116, 139, 0.32) !important;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.96)) !important;
          color: #111827 !important;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }

        :global([data-theme="light"]) .service-profile-cta-configure:hover {
          border-color: rgba(22, 163, 74, 0.35) !important;
          background: linear-gradient(180deg, rgba(240, 253, 244, 1), rgba(236, 253, 245, 0.98)) !important;
          box-shadow: 0 8px 20px rgba(22, 163, 74, 0.08);
        }

        :global([data-theme="light"]) .service-profile-cta-danger {
          border-color: rgba(239, 68, 68, 0.24) !important;
          background: rgba(254, 242, 242, 0.95) !important;
          color: #b91c1c !important;
        }

        :global([data-theme="light"]) .service-profile-cta-danger:hover {
          border-color: rgba(239, 68, 68, 0.34) !important;
          background: rgba(254, 226, 226, 0.98) !important;
          box-shadow: 0 8px 18px rgba(239, 68, 68, 0.08);
        }

        :global([data-theme="light"]) .service-profile-cta-reactivate {
          border-color: rgba(34, 197, 94, 0.25) !important;
          background: rgba(240, 253, 244, 0.92) !important;
          color: #15803d !important;
        }

        :global([data-theme="light"]) .service-profile-cta-reactivate:hover {
          border-color: rgba(22, 163, 74, 0.35) !important;
          background: rgba(220, 252, 231, 0.98) !important;
          box-shadow: 0 8px 18px rgba(22, 163, 74, 0.08);
        }

        :global([data-theme="light"]) .service-profile-badge[data-badge-tone="photos"] {
          background: rgba(236, 253, 245, 0.98) !important;
          border-color: rgba(22, 163, 74, 0.2) !important;
          color: #166534 !important;
        }

        :global([data-theme="light"]) .service-profile-badge[data-badge-tone="appointment"] {
          background: rgba(239, 246, 255, 0.98) !important;
          border-color: rgba(59, 130, 246, 0.2) !important;
          color: #1d4ed8 !important;
        }

        :global([data-theme="light"]) .service-profile-badge[data-badge-tone="emergency"] {
          background: rgba(255, 247, 237, 0.98) !important;
          border-color: rgba(249, 115, 22, 0.22) !important;
          color: #c2410c !important;
        }

        :global([data-theme="light"]) .service-profile-badge[data-badge-tone="travel"] {
          background: rgba(236, 254, 255, 0.98) !important;
          border-color: rgba(8, 145, 178, 0.22) !important;
          color: #0f766e !important;
        }

        :global([data-theme="light"]) .service-profile-badge[data-badge-tone="default"] {
          background: rgba(241, 245, 249, 0.98) !important;
          border-color: rgba(148, 163, 184, 0.28) !important;
          color: #334155 !important;
        }

        :global([data-theme="dark"]) .service-profile-card {
          border-color: rgba(148, 163, 184, 0.2) !important;
          box-shadow: 0 10px 26px rgba(2, 6, 23, 0.2);
        }

        :global([data-theme="dark"]) .service-profile-card:hover {
          border-color: rgba(34, 197, 94, 0.22) !important;
          box-shadow: 0 14px 30px rgba(2, 6, 23, 0.28);
        }

        :global([data-theme="dark"]) .service-profile-card-meta {
          color: rgba(226, 232, 240, 0.74) !important;
        }

        :global([data-theme="dark"]) .service-profile-actions {
          border-top-color: rgba(148, 163, 184, 0.12);
        }

        :global([data-theme="dark"]) .service-profile-cta-configure {
          border-color: rgba(148, 163, 184, 0.24) !important;
          background: rgba(15, 23, 42, 0.54) !important;
          color: #f8fafc !important;
        }

        :global([data-theme="dark"]) .service-profile-cta-configure:hover {
          border-color: rgba(34, 197, 94, 0.3) !important;
          background: rgba(15, 23, 42, 0.8) !important;
        }

        :global([data-theme="dark"]) .service-profile-cta-danger {
          border-color: rgba(248, 113, 113, 0.24) !important;
          background: rgba(69, 10, 10, 0.32) !important;
          color: #fca5a5 !important;
        }

        :global([data-theme="dark"]) .service-profile-cta-danger:hover {
          border-color: rgba(248, 113, 113, 0.34) !important;
          background: rgba(127, 29, 29, 0.32) !important;
        }

        :global([data-theme="dark"]) .service-profile-cta-reactivate {
          border-color: rgba(74, 222, 128, 0.24) !important;
          background: rgba(20, 83, 45, 0.3) !important;
          color: #86efac !important;
        }

        :global([data-theme="dark"]) .service-profile-cta-reactivate:hover {
          border-color: rgba(74, 222, 128, 0.34) !important;
          background: rgba(20, 83, 45, 0.42) !important;
        }

        :global([data-theme="dark"]) .service-profile-badge[data-badge-tone="photos"] {
          background: rgba(20, 83, 45, 0.34) !important;
          border-color: rgba(74, 222, 128, 0.22) !important;
          color: #86efac !important;
        }

        :global([data-theme="dark"]) .service-profile-badge[data-badge-tone="appointment"] {
          background: rgba(30, 64, 175, 0.28) !important;
          border-color: rgba(96, 165, 250, 0.22) !important;
          color: #bfdbfe !important;
        }

        :global([data-theme="dark"]) .service-profile-badge[data-badge-tone="emergency"] {
          background: rgba(124, 45, 18, 0.32) !important;
          border-color: rgba(251, 146, 60, 0.24) !important;
          color: #fdba74 !important;
        }

        :global([data-theme="dark"]) .service-profile-badge[data-badge-tone="travel"] {
          background: rgba(17, 94, 89, 0.3) !important;
          border-color: rgba(45, 212, 191, 0.22) !important;
          color: #99f6e4 !important;
        }

        :global([data-theme="dark"]) .service-profile-badge[data-badge-tone="default"] {
          background: rgba(51, 65, 85, 0.5) !important;
          border-color: rgba(148, 163, 184, 0.22) !important;
          color: #e2e8f0 !important;
        }

        @media (max-width: 640px) {
          .service-profile-badge {
            white-space: normal;
          }

          .service-profile-actions {
            flex-wrap: wrap;
          }

          .service-profile-cta {
            min-width: 100%;
          }
        }
      `}</style>
    </main>
  )
}

function ServiceProfileAccordion({
  title,
  sectionKey,
  open,
  onToggle,
  children,
}: {
  title: string
  sectionKey: string
  open: boolean
  onToggle: (key: string) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
      <button
        onClick={() => onToggle(sectionKey)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: 'var(--bg-hover)', border: 'none',
          color: 'var(--text-1)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        }}
      >
        <span>{title}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-3)' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '14px', background: 'var(--bg)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
