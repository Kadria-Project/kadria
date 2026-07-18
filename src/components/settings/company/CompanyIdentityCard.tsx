'use client'

import { useState } from 'react'
import type { CompanySettingsValues } from '@/src/components/settings/sections/CompanySettingsSection'
import { Card, fieldClassName, SaveButton } from './CompanyFormPrimitives'

function validUrl(value: string) { if (!value.trim()) return true; try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' } catch { return false } }

export function CompanyIdentityCard({ values, onSave, readOnly }: { values: CompanySettingsValues; onSave: (values: CompanySettingsValues) => Promise<void>; readOnly: boolean }) {
  const [local, setLocal] = useState(values), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false), [error, setError] = useState('')
  const save = async () => { if (!validUrl(local.websiteUrl) || !validUrl(local.googleReviewUrl)) return setError('Les liens doivent être des URL HTTP(S) valides.'); setSaving(true); setError(''); try { await onSave(local); setSaved(true); window.setTimeout(() => setSaved(false), 3000) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.') } finally { setSaving(false) } }
  return <Card title="Identité de l’entreprise" description="Les informations publiques qui permettent à vos clients de vous identifier."><fieldset disabled={readOnly} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Nom commercial<input className={fieldClassName} value={local.companyName} onChange={(event) => setLocal({ ...local, companyName: event.target.value })} placeholder="Martin Rénovation" /></label><label className="text-sm font-medium text-slate-700">Site web<input className={fieldClassName} value={local.websiteUrl} onChange={(event) => setLocal({ ...local, websiteUrl: event.target.value })} placeholder="https://monsite.fr" /></label></div><label className="block text-sm font-medium text-slate-700">Lien vers vos avis Google<input className={fieldClassName} value={local.googleReviewUrl} onChange={(event) => setLocal({ ...local, googleReviewUrl: event.target.value })} placeholder="https://g.page/r/..." /><span className="mt-1 block text-xs font-normal text-slate-500">Utilisé pour solliciter les avis de vos clients.</span></label></fieldset>{!readOnly && <div className="mt-5 border-t border-slate-100 pt-4"><SaveButton saving={saving} saved={saved} onClick={save} />{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}</div>}</Card>
}
