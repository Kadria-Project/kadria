'use client'

import { useEffect, useState } from 'react'
import type { TenantRole } from '@/src/lib/team/types'
import type { CompanySettingsValues } from '@/src/components/settings/sections/CompanySettingsSection'

type BrandingUploadTarget = 'company_logo'
// Le contrat legacy est volontairement souple car /parametres consomme aussi
// des domaines hors du module Entreprise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArtisanSettingsConfig = Record<string, any>

const EMPTY_VALUES: CompanySettingsValues = {
  companyName: '', websiteUrl: '', googleReviewUrl: '', phone: '', notificationEmail: '',
  adressePro: '', cpPro: '', villePro: '', logoUrl: '',
  raisonSociale: '', formeJuridique: '', siret: '', tvaNumber: '', tvaAssujetti: true,
  assureur: '', numAssurance: '', assuranceNonRequise: false, devisMentionLegale: '',
}

const text = (value: unknown) => typeof value === 'string' ? value : ''
const bool = (value: unknown, fallback = false) => typeof value === 'boolean' ? value : fallback

function toCompanySettingsValues(config: ArtisanSettingsConfig): CompanySettingsValues {
  return {
    companyName: text(config.companyName), websiteUrl: text(config.websiteUrl), googleReviewUrl: text(config.googleReviewUrl),
    phone: text(config.phone), notificationEmail: text(config.notificationEmail), adressePro: text(config.adressePro),
    cpPro: text(config.cpPro), villePro: text(config.villePro), logoUrl: text(config.logoUrl),
    raisonSociale: text(config.raisonSociale), formeJuridique: text(config.formeJuridique), siret: text(config.siret),
    tvaNumber: text(config.tvaNumber), tvaAssujetti: bool(config.tvaAssujetti, true), assureur: text(config.assureur),
    numAssurance: text(config.numAssurance), assuranceNonRequise: bool(config.assuranceNonRequise),
    devisMentionLegale: text(config.devisMentionLegale),
  }
}

export function useCompanySettingsData() {
  const [role, setRole] = useState<TenantRole | null>(null)
  const [permissionsLoading, setPermissionsLoading] = useState(true)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [teamTabVisible, setTeamTabVisible] = useState(true)
  const [config, setConfig] = useState<ArtisanSettingsConfig | null>(null)
  const [values, setValues] = useState<CompanySettingsValues>(EMPTY_VALUES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingTarget, setUploadingTarget] = useState<BrandingUploadTarget | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const onSaved = (nextValues: CompanySettingsValues) => {
    setValues(nextValues)
    setConfig((current) => current ? { ...current, ...nextValues } : current)
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    fetch('/api/team', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) { setTeamTabVisible(false); setPermissionsError('Les autorisations n’ont pas pu être vérifiées. Réessayez.'); return }
      const data = await response.json().catch(() => null)
      if (data?.membership?.role) setRole(data.membership.role as TenantRole)
      else setPermissionsError('Les autorisations n’ont pas pu être vérifiées. Réessayez.')
    }).catch(() => { setPermissionsError('Les autorisations n’ont pas pu être vérifiées. Réessayez.') }).finally(() => setPermissionsLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/artisan/config').then((response) => response.json()).then((data) => {
      if (cancelled || !data?.success || !data.config) return
      const nextConfig = data.config as ArtisanSettingsConfig
      setConfig(nextConfig); setValues(toCompanySettingsValues(nextConfig))
    }).catch((cause: unknown) => {
      if (!cancelled) { console.error('[COMPANY SETTINGS LOAD]', cause); setError("Kadria n'a pas pu charger les paramètres de l'entreprise.") }
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const save = async (nextValues: CompanySettingsValues) => {
    setSaving(true); setError(null)
    try {
      const response = await fetch('/api/artisan/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextValues) })
      const data = await response.json()
      if (!data.success) throw new Error("Kadria n'a pas pu enregistrer ces modifications.")
      onSaved(nextValues)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Kadria n'a pas pu enregistrer ces modifications."
      setError(message); throw new Error(message)
    } finally { setSaving(false) }
  }

  const uploadLogo = async (file: File) => {
    setUploadingTarget('company_logo'); setUploadError(null)
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('target', 'company_logo')
      const response = await fetch('/api/uploads/artisan-branding', { method: 'POST', body: formData })
      const data = await response.json()
      if (!data.success || !data.url) throw new Error(data.error || "Erreur lors de l'import de l'image")
      const logoUrl = data.url as string
      setValues((current) => ({ ...current, logoUrl })); setConfig((current) => current ? { ...current, logoUrl } : current)
    } catch (cause) { console.error('[COMPANY SETTINGS UPLOAD]', cause); setUploadError(cause instanceof Error ? cause.message : "Erreur lors de l'import de l'image") }
    finally { setUploadingTarget(null) }
  }

  const removeLogo = () => { setValues((current) => ({ ...current, logoUrl: '' })); setConfig((current) => current ? { ...current, logoUrl: '' } : current) }
  return { role, permissionsLoading, permissionsError, teamTabVisible, config, values, loading, error, saving, isMobile, uploading: uploadingTarget === 'company_logo', uploadError, save, onSaved, uploadLogo, removeLogo }
}
