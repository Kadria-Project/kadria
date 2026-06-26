'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import { ARTISAN_TRADES } from '@/src/config/trades'

interface BusinessProfile {
  primaryTrade: string
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

const EMPTY_PROFILE: BusinessProfile = {
  primaryTrade: '',
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogError, setCatalogError] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: '', priceHt: '', unit: '', durationMinutes: '', vatRate: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profileRes, catalogRes] = await Promise.all([
          fetch('/api/artisan/business-profile').then((r) => r.json()),
          fetch('/api/artisan/service-catalog').then((r) => r.json()),
        ])
        if (cancelled) return
        if (profileRes.success) {
          setProfile(profileFromRow(profileRes.profile))
          setHasProfile(!!profileRes.profile)
        }
        if (catalogRes.success) {
          setCatalog(catalogRes.items || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/artisan/business-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryTrade: profile.primaryTrade,
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
      setProfile(profileFromRow(data.profile))
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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-2)', fontFamily: 'system-ui',
      }}>
        Chargement...
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
          <h3 style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🪪 Identité métier
          </h3>
          <div style={fieldWrap}>
            <label style={labelStyle}>Métier principal</label>
            <select
              value={profile.primaryTrade}
              onChange={(e) => setProfile((p) => ({ ...p, primaryTrade: e.target.value }))}
              style={inputStyle}
            >
              <option value="">Sélectionner un métier</option>
              {ARTISAN_TRADES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Spécialités (séparées par des virgules)</label>
            <input
              type="text"
              value={toCsv(profile.specialties)}
              onChange={(e) => setProfile((p) => ({ ...p, specialties: fromCsv(e.target.value) }))}
              placeholder="Ex : pompe à chaleur, climatisation réversible"
              style={inputStyle}
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Prestations exclues (séparées par des virgules)</label>
            <input
              type="text"
              value={toCsv(profile.excludedServices)}
              onChange={(e) => setProfile((p) => ({ ...p, excludedServices: fromCsv(e.target.value) }))}
              placeholder="Ex : dépannage chaudière fioul"
              style={inputStyle}
            />
          </div>
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
      </div>
    </main>
  )
}
