'use client'

import { useState } from 'react'
import type { CompanySettingsValues } from '@/src/components/settings/sections/CompanySettingsSection'
import type { CompanySettingsDomain, CompanySettingsPatch } from '@/src/lib/settings/company-contract'

export function useCompanyDomainSave(values: CompanySettingsValues, onSaved: (next: CompanySettingsValues) => void) {
  const [saving, setSaving] = useState<CompanySettingsDomain | null>(null)
  const [messages, setMessages] = useState<Partial<Record<CompanySettingsDomain, string>>>({})
  const save = async (domain: CompanySettingsDomain, patch: CompanySettingsPatch) => {
    if (saving) return
    setSaving(domain); setMessages(current => ({ ...current, [domain]: '' }))
    try {
      const response = await fetch('/api/artisan/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Enregistrement impossible.')
      onSaved({ ...values, ...patch })
      setMessages(current => ({ ...current, [domain]: 'Enregistré' }))
    } catch (cause) {
      setMessages(current => ({ ...current, [domain]: cause instanceof Error ? cause.message : 'Enregistrement impossible.' }))
    } finally { setSaving(null) }
  }
  return { saving, messages, save }
}
