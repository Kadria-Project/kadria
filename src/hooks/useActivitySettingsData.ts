'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TenantRole } from '@/src/lib/team/types'
import type { UserVehicleProfile } from '@/src/lib/profile/types'

export type BusinessProfile = {
  primaryTrade: string; coveredTrades: string[]; specialties: string[]; excludedServices: string[]
  baseCity: string; interventionRadiusKm: string; travelFeeHt: string; travelFeePerKm: string
}
export type CatalogItem = { id: string; name: string; category: string | null; price_ht: number | null; unit: string | null; estimated_duration_minutes: number | null; vat_rate: number | null; is_active: boolean }
export type ServiceProfile = { id: string; name: string; category: string | null; description: string | null; is_active: boolean; qualification_questions: string[]; qualification_fields: Array<{ id: string; label: string; required: boolean; order: number }>; required_information: string[]; required_photos: boolean; travel_required: boolean; appointment_recommended: boolean; emergency_supported: boolean }
export type TravelSettings = { vehicleType: string; consumptionPer100Km: string; electricityPricePerKwh: string; minimumTravelFee: string; freeTravelRadiusKm: string }

const emptyProfile: BusinessProfile = { primaryTrade: '', coveredTrades: [], specialties: [], excludedServices: [], baseCity: '', interventionRadiusKm: '', travelFeeHt: '', travelFeePerKm: '' }
const emptyTravel: TravelSettings = { vehicleType: '', consumptionPer100Km: '', electricityPricePerKwh: '', minimumTravelFee: '', freeTravelRadiusKm: '' }
const asText = (value: unknown) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const numberOrNull = (value: string) => value.trim() === '' ? null : Number.isFinite(Number(value.replace(',', '.'))) ? Number(value.replace(',', '.')) : null

/**
 * Contrôleur unique de l'espace Activité. Le profil moderne reste la source de
 * vérité; travelConfig est le seul fragment Activité encore hébergé par le
 * contrat legacy /api/artisan/config.
 */
export function useActivitySettingsData() {
  const [role, setRole] = useState<TenantRole | null>(null)
  const [profile, setProfile] = useState<BusinessProfile>(emptyProfile)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [serviceProfiles, setServiceProfiles] = useState<ServiceProfile[]>([])
  const [vehicle, setVehicle] = useState<UserVehicleProfile | null>(null)
  const [travel, setTravel] = useState<TravelSettings>(emptyTravel)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})

  const setResult = (domain: string, state: 'idle' | 'saving' | 'saved' | 'error', message = '') => {
    setStatus(current => ({ ...current, [domain]: state })); setMessages(current => ({ ...current, [domain]: message }))
    if (state === 'saved') window.setTimeout(() => setStatus(current => ({ ...current, [domain]: 'idle' })), 2500)
  }
  const normalizeProfile = (row: Record<string, unknown> | null): BusinessProfile => row ? {
    primaryTrade: asText(row.primary_trade), coveredTrades: strings(row.covered_trades), specialties: strings(row.specialties), excludedServices: strings(row.excluded_services), baseCity: asText(row.base_city), interventionRadiusKm: asText(row.intervention_radius_km), travelFeeHt: asText(row.travel_fee_ht), travelFeePerKm: asText(row.travel_fee_per_km),
  } : emptyProfile
  const reload = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [profileRes, catalogRes, profilesRes, vehicleRes, configRes, teamRes] = await Promise.all([
        fetch('/api/artisan/business-profile'), fetch('/api/artisan/service-catalog'), fetch('/api/artisan/service-profiles'), fetch('/api/profile/vehicle'), fetch('/api/artisan/config'), fetch('/api/team'),
      ])
      const [profileData, catalogData, profilesData, vehicleData, configData, teamData] = await Promise.all([profileRes.json(), catalogRes.json(), profilesRes.json(), vehicleRes.json(), configRes.json(), teamRes.json().catch(() => null)])
      if (!profileData?.success || !catalogData?.success || !profilesData?.success) throw new Error('Kadria n’a pas pu charger les réglages d’activité.')
      setProfile(normalizeProfile(profileData.profile)); setCatalog(catalogData.items || []); setServiceProfiles(profilesData.profiles || [])
      setVehicle(vehicleData?.success ? vehicleData.profile || null : null)
      const config = configData?.success ? configData.config : null; const travelConfig = config?.travelConfig || {}
      setTravel({ vehicleType: asText(travelConfig.vehicleType), consumptionPer100Km: asText(travelConfig.consumptionPer100Km), electricityPricePerKwh: asText(travelConfig.electricityPricePerKwh), minimumTravelFee: asText(travelConfig.minimumTravelFee), freeTravelRadiusKm: asText(travelConfig.freeTravelRadiusKm) })
      if (teamData?.membership?.role) setRole(teamData.membership.role as TenantRole)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur de chargement.') } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    // La lecture est différée afin de ne pas chaîner un setState pendant la phase
    // de synchronisation de l'effet React.
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const saveProfile = async (domain: string, patch: Partial<BusinessProfile>) => {
    setResult(domain, 'saving')
    try {
      const body: Record<string, unknown> = {}
      if ('primaryTrade' in patch) body.primaryTrade = patch.primaryTrade
      if ('coveredTrades' in patch) body.coveredTrades = patch.coveredTrades
      if ('specialties' in patch) body.specialties = patch.specialties
      if ('excludedServices' in patch) body.excludedServices = patch.excludedServices
      if ('baseCity' in patch) body.baseCity = patch.baseCity
      if ('interventionRadiusKm' in patch) body.interventionRadiusKm = numberOrNull(patch.interventionRadiusKm || '')
      if ('travelFeeHt' in patch) body.travelFeeHt = numberOrNull(patch.travelFeeHt || '')
      if ('travelFeePerKm' in patch) body.travelFeePerKm = numberOrNull(patch.travelFeePerKm || '')
      const response = await fetch('/api/artisan/business-profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Enregistrement impossible.')
      setProfile(normalizeProfile(data.profile)); setResult(domain, 'saved', 'Enregistré')
    } catch (cause) { setResult(domain, 'error', cause instanceof Error ? cause.message : 'Enregistrement impossible.') }
  }
  const reportUnknownTrade = async (tradeName: string) => {
    setResult('trade', 'saving')
    try { const response = await fetch('/api/artisan/unknown-trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeName, specialties: profile.specialties }) }); if (!response.ok) throw new Error('Le signalement n’a pas pu être envoyé.'); setResult('trade', 'saved', 'Signalement envoyé') } catch (cause) { setResult('trade', 'error', cause instanceof Error ? cause.message : 'Signalement impossible.') }
  }
  const toggleCatalog = async (item: CatalogItem) => { setResult('services', 'saving'); try { const response = await fetch(`/api/artisan/service-catalog/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !item.is_active }) }); const data = await response.json(); if (!data?.success) throw new Error(data?.error || 'Mise à jour impossible.'); setCatalog(current => current.map(row => row.id === item.id ? data.item : row)); setResult('services', 'saved', 'Catalogue mis à jour') } catch (cause) { setResult('services', 'error', cause instanceof Error ? cause.message : 'Mise à jour impossible.') } }
  const toggleServiceProfile = async (item: ServiceProfile) => { setResult('qualification', 'saving'); try { const response = await fetch(`/api/artisan/service-profiles/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !item.is_active }) }); const data = await response.json(); if (!data?.success) throw new Error(data?.error || 'Mise à jour impossible.'); setServiceProfiles(current => current.map(row => row.id === item.id ? data.profile : row)); setResult('qualification', 'saved', 'Profil de service mis à jour') } catch (cause) { setResult('qualification', 'error', cause instanceof Error ? cause.message : 'Mise à jour impossible.') } }
  const saveTravel = async (nextTravel: TravelSettings, nextVehicle: UserVehicleProfile | null) => { setResult('travel', 'saving'); try { const [configResponse, vehicleResponse] = await Promise.all([fetch('/api/artisan/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ travelConfig: { vehicleType: nextTravel.vehicleType || undefined, consumptionPer100Km: numberOrNull(nextTravel.consumptionPer100Km), electricityPricePerKwh: numberOrNull(nextTravel.electricityPricePerKwh), minimumTravelFee: numberOrNull(nextTravel.minimumTravelFee), freeTravelRadiusKm: numberOrNull(nextTravel.freeTravelRadiusKm) } }) }), nextVehicle ? fetch('/api/profile/vehicle', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextVehicle) }) : Promise.resolve(null)]); const configData = await configResponse.json(); const vehicleData = vehicleResponse ? await vehicleResponse.json() : null; if (!configData?.success || (vehicleData && !vehicleData.success)) throw new Error(configData?.error || vehicleData?.error || 'Enregistrement impossible.'); setTravel(nextTravel); if (vehicleData?.profile) setVehicle(vehicleData.profile); setResult('travel', 'saved', 'Déplacements enregistrés') } catch (cause) { setResult('travel', 'error', cause instanceof Error ? cause.message : 'Enregistrement impossible.') } }
  const derived = useMemo(() => ({ activeCatalog: catalog.filter(item => item.is_active), inactiveCatalog: catalog.filter(item => !item.is_active), activeServiceProfiles: serviceProfiles.filter(item => item.is_active), inactiveServiceProfiles: serviceProfiles.filter(item => !item.is_active) }), [catalog, serviceProfiles])
  return { role, profile, setProfile, catalog, serviceProfiles, vehicle, setVehicle, travel, setTravel, loading, error, status, messages, derived, reload, saveProfile, saveTravel, reportUnknownTrade, toggleCatalog, toggleServiceProfile }
}
