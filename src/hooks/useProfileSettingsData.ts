'use client'

import { useEffect, useState } from 'react'
import { hasPermission } from '@/src/lib/team/permission-matrix'
import type { ProfessionalProfile } from '@/src/lib/profile/types'
import type { TenantRole } from '@/src/lib/team/types'

const EMPTY_PROFILE: ProfessionalProfile = { firstName: '', lastName: '', email: '', professionalPhone: '', jobTitle: '' }

export function useProfileSettingsData(role: TenantRole | null, onSaved?: (profile: ProfessionalProfile) => void) {
  const [values, setValues] = useState<ProfessionalProfile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const canUpdate = role !== null && (hasPermission(role, 'account.update_self') || hasPermission(role, 'profile.update_self'))

  useEffect(() => {
    let cancelled = false
    fetch('/api/profile').then(async (response) => {
      const data = await response.json()
      if (!response.ok || !data?.success) throw new Error(data?.error || 'PROFILE_GET_FAILED')
      if (!cancelled) setValues({ ...EMPTY_PROFILE, ...data.profile })
    }).catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'PROFILE_GET_FAILED') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const save = async (nextValues: ProfessionalProfile) => {
    setSaving(true); setError(null)
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextValues) })
      const data = await response.json()
      if (!response.ok || !data?.success) throw new Error(data?.error || 'PROFILE_PATCH_FAILED')
      const profile = { ...EMPTY_PROFILE, ...data.profile } as ProfessionalProfile
      setValues(profile); onSaved?.(profile)
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'PROFILE_PATCH_FAILED'; setError(message); throw new Error(message) }
    finally { setSaving(false) }
  }

  return { values, loading, error, saving, success: !error && !loading, canUpdate, save, onSaved: (profile: ProfessionalProfile) => { setValues(profile); onSaved?.(profile) } }
}
