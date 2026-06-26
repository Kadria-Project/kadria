'use client'

// Assistant de configuration métier (wizard 6 étapes) : permet à l'artisan
// d'obtenir en moins de 3 minutes un profil métier, un catalogue initial,
// des profils de prestations et des règles de chiffrage de base.
//
// Composant autonome et réutilisable : il ne lit/écrit que via les routes
// existantes (business-profile, service-profiles), scopées par session côté
// serveur — aucun artisan_id n'est jamais envoyé depuis le client.

import { useState } from 'react'
import {
  SERVICE_PROFILE_TRADES,
  SERVICE_PROFILE_TEMPLATES,
  ServiceProfileTemplate,
} from '@/src/lib/service-profile-templates'
import {
  buildBusinessProfilePayloadFromWizard,
  serviceProfileTemplateToWizardPayload,
  WizardWorkMethodAnswers,
  WizardPricingAnswers,
  WizardZoneAnswers,
} from '@/src/lib/business-setup'

interface BusinessSetupWizardServiceProfile {
  name: string
}

interface BusinessSetupWizardProps {
  existingServiceProfiles?: BusinessSetupWizardServiceProfile[]
  onClose: () => void
  onComplete: (result: { profile: Record<string, unknown> | null; importedServiceProfiles: Record<string, unknown>[] }) => void
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

const STEP_LABELS = ['Métier', 'Prestations', 'Méthode de travail', 'Chiffrage', 'Zone et horaires', 'Validation']

export function BusinessSetupWizard({ existingServiceProfiles = [], onClose, onComplete }: BusinessSetupWizardProps) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const [trade, setTrade] = useState(SERVICE_PROFILE_TRADES[0].value)
  const [selectedTemplateNames, setSelectedTemplateNames] = useState<Set<string>>(
    new Set((SERVICE_PROFILE_TEMPLATES[SERVICE_PROFILE_TRADES[0].value] || []).map((t) => t.name))
  )

  const [workMethod, setWorkMethod] = useState<WizardWorkMethodAnswers>({
    travelBilled: true,
    acceptsEmergencies: true,
    requiresPhotosBeforeVisit: true,
    prefersAppointmentBeforeQuote: false,
    worksOnSaturday: false,
  })

  const [pricing, setPricing] = useState<WizardPricingAnswers>({
    hourlyRateHt: '',
    travelFeeHt: '',
    defaultVatRate: '',
    diagnosticFeeHt: '',
    defaultMarginPercent: '',
    paymentTerms: '',
  })

  const [zone, setZone] = useState<WizardZoneAnswers>({
    baseCity: '',
    interventionRadiusKm: '',
    workStartTime: '08:00',
    workEndTime: '18:00',
    workingDays: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
  })

  const existingNames = new Set(existingServiceProfiles.map((sp) => sp.name.trim().toLowerCase()))
  const tradeTemplates: ServiceProfileTemplate[] = SERVICE_PROFILE_TEMPLATES[trade] || []
  const selectedTemplates = tradeTemplates.filter((t) => selectedTemplateNames.has(t.name) && !existingNames.has(t.name.trim().toLowerCase()))
  const tradeLabel = SERVICE_PROFILE_TRADES.find((t) => t.value === trade)?.label || trade

  function selectTrade(value: string) {
    setTrade(value)
    setSelectedTemplateNames(new Set((SERVICE_PROFILE_TEMPLATES[value] || []).map((t) => t.name)))
  }

  function toggleTemplate(name: string) {
    setSelectedTemplateNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleWorkingDay(value: string) {
    setZone((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(value)
        ? prev.workingDays.filter((d) => d !== value)
        : [...prev.workingDays, value],
    }))
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const profilePayload = buildBusinessProfilePayloadFromWizard(tradeLabel, workMethod, pricing, zone)
      const profileRes = await fetch('/api/artisan/business-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      })
      const profileData = await profileRes.json()
      if (!profileData.success) {
        throw new Error(profileData.error || 'Erreur lors de la sauvegarde du profil métier')
      }

      const imported: Record<string, unknown>[] = []
      for (const template of selectedTemplates) {
        const res = await fetch('/api/artisan/service-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceProfileTemplateToWizardPayload(template, workMethod)),
        })
        const data = await res.json()
        if (data.success && data.profile) {
          imported.push(data.profile)
        }
      }

      setImportedCount(imported.length)
      setDone(true)
      onComplete({ profile: profileData.profile, importedServiceProfiles: imported })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px', zIndex: 1000,
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px',
    padding: '20px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
  }

  const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--text-2)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-1)', fontSize: '14px',
  }
  const fieldWrap: React.CSSProperties = { marginBottom: '14px' }

  function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        {[{ v: true, label: 'Oui' }, { v: false, label: 'Non' }].map((opt) => (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange(opt.v)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              border: value === opt.v ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: value === opt.v ? 'var(--accent)' : 'var(--bg-hover)',
              color: value === opt.v ? 'black' : 'var(--text-2)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  if (done) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>✅</div>
          <h3 style={{ color: 'var(--text-1)', fontSize: '16px', margin: '0 0 8px' }}>
            Votre métier est configuré. Kadria peut désormais mieux qualifier vos demandes et préparer vos devis.
          </h3>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: '0 0 16px' }}>
            {importedCount} prestation{importedCount === 1 ? '' : 's'} importée{importedCount === 1 ? '' : 's'} dans votre bibliothèque.
          </p>
          <button
            onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'black', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
          >
            Fermer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ color: 'var(--text-3)', fontSize: '12px', fontWeight: 700 }}>
            {step + 1} / {STEP_LABELS.length} · {STEP_LABELS[step]}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ height: '4px', borderRadius: '4px', background: 'var(--border)', marginBottom: '18px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((step + 1) / STEP_LABELS.length) * 100}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
        </div>

        {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

        {step === 0 && (
          <div>
            <h3 style={{ color: 'var(--text-1)', fontSize: '15px', margin: '0 0 12px' }}>Quel est votre métier principal ?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SERVICE_PROFILE_TRADES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => selectTrade(t.value)}
                  style={{
                    textAlign: 'left', padding: '12px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    border: trade === t.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: trade === t.value ? 'var(--accent)' : 'var(--bg-hover)',
                    color: trade === t.value ? 'black' : 'var(--text-1)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 style={{ color: 'var(--text-1)', fontSize: '15px', margin: '0 0 6px' }}>Sélectionnez les prestations que vous proposez réellement.</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 12px' }}>Tout est coché par défaut, décochez ce que vous ne proposez pas.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {tradeTemplates.map((t) => {
                const alreadyExists = existingNames.has(t.name.trim().toLowerCase())
                return (
                  <label
                    key={t.name}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px',
                      borderRadius: '8px', border: '1px solid var(--border)',
                      opacity: alreadyExists ? 0.5 : 1, cursor: alreadyExists ? 'default' : 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTemplateNames.has(t.name) && !alreadyExists}
                      disabled={alreadyExists}
                      onChange={() => toggleTemplate(t.name)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 600 }}>
                        {t.name}{alreadyExists ? ' · Déjà configuré' : ''}
                      </div>
                      <div style={{ color: 'var(--text-3)', fontSize: '11px' }}>{t.description}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ color: 'var(--text-1)', fontSize: '15px', margin: '0 0 12px' }}>Méthode de travail</h3>
            {[
              { key: 'travelBilled' as const, label: 'Facturez-vous le déplacement ?' },
              { key: 'acceptsEmergencies' as const, label: 'Acceptez-vous les urgences ?' },
              { key: 'requiresPhotosBeforeVisit' as const, label: 'Demandez-vous des photos avant déplacement ?' },
              { key: 'prefersAppointmentBeforeQuote' as const, label: 'Préférez-vous planifier un rendez-vous avant devis ?' },
              { key: 'worksOnSaturday' as const, label: 'Travaillez-vous le samedi ?' },
            ].map((q) => (
              <div key={q.key} style={fieldWrap}>
                <label style={labelStyle}>{q.label}</label>
                <YesNo
                  value={workMethod[q.key]}
                  onChange={(v) => {
                    setWorkMethod((prev) => ({ ...prev, [q.key]: v }))
                    if (q.key === 'worksOnSaturday') {
                      setZone((prev) => ({
                        ...prev,
                        workingDays: v
                          ? Array.from(new Set([...prev.workingDays, 'samedi']))
                          : prev.workingDays.filter((d) => d !== 'samedi'),
                      }))
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={{ color: 'var(--text-1)', fontSize: '15px', margin: '0 0 6px' }}>Chiffrage de base</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '0 0 12px' }}>Champs facultatifs — laissez vide si vous préférez les renseigner plus tard.</p>
            <div style={fieldWrap}>
              <label style={labelStyle}>Tarif horaire HT (€)</label>
              <input style={inputStyle} value={pricing.hourlyRateHt} onChange={(e) => setPricing((p) => ({ ...p, hourlyRateHt: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Frais de déplacement HT (€)</label>
              <input style={inputStyle} value={pricing.travelFeeHt} onChange={(e) => setPricing((p) => ({ ...p, travelFeeHt: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>TVA par défaut (%)</label>
              <input style={inputStyle} value={pricing.defaultVatRate} onChange={(e) => setPricing((p) => ({ ...p, defaultVatRate: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Forfait diagnostic (€)</label>
              <input style={inputStyle} value={pricing.diagnosticFeeHt} onChange={(e) => setPricing((p) => ({ ...p, diagnosticFeeHt: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Marge par défaut (%)</label>
              <input style={inputStyle} value={pricing.defaultMarginPercent} onChange={(e) => setPricing((p) => ({ ...p, defaultMarginPercent: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Conditions de paiement</label>
              <input style={inputStyle} value={pricing.paymentTerms} onChange={(e) => setPricing((p) => ({ ...p, paymentTerms: e.target.value }))} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 style={{ color: 'var(--text-1)', fontSize: '15px', margin: '0 0 12px' }}>Zone et horaires</h3>
            <div style={fieldWrap}>
              <label style={labelStyle}>Ville de départ</label>
              <input style={inputStyle} value={zone.baseCity} onChange={(e) => setZone((z) => ({ ...z, baseCity: e.target.value }))} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Rayon d&apos;intervention (km)</label>
              <input style={inputStyle} value={zone.interventionRadiusKm} onChange={(e) => setZone((z) => ({ ...z, interventionRadiusKm: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={fieldWrap}>
                <label style={labelStyle}>Heure de début</label>
                <input type="time" style={inputStyle} value={zone.workStartTime} onChange={(e) => setZone((z) => ({ ...z, workStartTime: e.target.value }))} />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Heure de fin</label>
                <input type="time" style={inputStyle} value={zone.workEndTime} onChange={(e) => setZone((z) => ({ ...z, workEndTime: e.target.value }))} />
              </div>
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Jours travaillés</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {WEEK_DAYS.map((d) => {
                  const active = zone.workingDays.includes(d.value)
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWorkingDay(d.value)}
                      style={{
                        padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: active ? 'var(--accent)' : 'var(--bg-hover)',
                        color: active ? 'black' : 'var(--text-2)',
                      }}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 style={{ color: 'var(--text-1)', fontSize: '15px', margin: '0 0 12px' }}>Kadria va configurer :</h3>
            <ul style={{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 16px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Profil métier : {tradeLabel}</li>
              <li>{selectedTemplates.length} prestation{selectedTemplates.length === 1 ? '' : 's'}</li>
              <li>Règles de déplacement</li>
              <li>Règles de chiffrage</li>
              <li>Habitudes de qualification</li>
            </ul>
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none',
                background: 'var(--accent)', color: 'black', fontWeight: 700, fontSize: '14px',
                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Configuration en cours…' : 'Créer ma configuration métier'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button
            onClick={goBack}
            disabled={step === 0}
            style={{
              padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-hover)', color: 'var(--text-2)', fontSize: '13px', fontWeight: 600,
              cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.5 : 1,
            }}
          >
            Retour
          </button>
          {step < STEP_LABELS.length - 1 && (
            <button
              onClick={goNext}
              style={{
                padding: '9px 16px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: 'black', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Continuer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
