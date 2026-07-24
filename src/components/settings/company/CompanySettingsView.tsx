'use client'

import { useState, type ReactNode } from 'react'
import { hasPermission } from '@/src/lib/team/permission-matrix'
import { ReadOnlyNotice } from '@/src/components/settings/ReadOnlyNotice'
import { SettingsPanel } from '@/src/components/settings/SettingsPanel'
import { companyPanelStatus, type CompanySettingsDomain } from '@/src/lib/settings/company-contract'
import { useCompanySettingsData } from '@/src/hooks/useCompanySettingsData'
import { useCompanyDomainSave } from '@/src/hooks/useCompanyDomainSave'

const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50'
type Values = ReturnType<typeof useCompanySettingsData>['values']

function CompanyForm({ values, readOnly, onSave, saving, message, children }: { values: Values; readOnly: boolean; onSave: (patch: Partial<Values>) => void; saving: boolean; message?: string; children: (set: <K extends keyof Values>(key: K, value: Values[K]) => void, draft: Values) => ReactNode }) {
  const [draft, setDraft] = useState(values)
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setDraft({ ...draft, [key]: value })
  return <>{children(set, draft)}<div className="mt-4 flex items-center gap-3"><button type="button" disabled={readOnly || saving} onClick={() => onSave(draft)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Sauvegarde…' : 'Enregistrer'}</button>{message && <p className={message === 'Enregistré' ? 'text-sm text-emerald-700' : 'text-sm text-red-600'}>{message}</p>}</div></>
}

export function CompanySettingsView() {
  const company = useCompanySettingsData()
  const readOnly = !hasPermission(company.role ?? 'viewer', 'company.update')
  const domainSave = useCompanyDomainSave(company.values, company.onSaved)
  const save = (domain: CompanySettingsDomain) => (draft: Partial<Values>) => {
    const fields = { identity: ['companyName', 'raisonSociale', 'websiteUrl', 'googleReviewUrl'], contact: ['phone', 'notificationEmail', 'adressePro', 'cpPro', 'villePro'], branding: ['logoUrl'], legal: ['formeJuridique', 'siret', 'tvaNumber', 'tvaAssujetti', 'assureur', 'numAssurance', 'assuranceNonRequise', 'devisMentionLegale'] } as const
    const patch = Object.fromEntries(fields[domain].map(key => [key, draft[key]])) as Partial<Values>
    void domainSave.save(domain, patch)
  }
  if (company.loading) return <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Chargement des informations de l’entreprise…</div>
  if (company.error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{company.error}</p>
  const panel = (domain: CompanySettingsDomain, title: string, description: string, content: Parameters<typeof CompanyForm>[0]['children']) => <SettingsPanel title={title} description={description} status={readOnly ? 'read-only' : companyPanelStatus(domain, company.values)}><CompanyForm values={company.values} readOnly={readOnly} onSave={save(domain)} saving={domainSave.saving === domain} message={domainSave.messages[domain]}>{content}</CompanyForm></SettingsPanel>
  return <div className="space-y-4">{readOnly && <ReadOnlyNotice message="Ces informations sont en lecture seule pour votre rôle." />}
    {panel('identity', 'Identité de l’entreprise', 'Ces informations permettent à Kadria d’identifier votre entreprise auprès de vos clients.', (set, d) => <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Nom commercial<input className={input} disabled={readOnly} value={d.companyName} onChange={e => set('companyName', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">Raison sociale (si différente)<input className={input} disabled={readOnly} value={d.raisonSociale} onChange={e => set('raisonSociale', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">Site internet<input className={input} disabled={readOnly} value={d.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">Lien d’avis Google<input className={input} disabled={readOnly} value={d.googleReviewUrl} onChange={e => set('googleReviewUrl', e.target.value)} /></label></div>)}
    {panel('contact', 'Coordonnées', 'Kadria utilise ces coordonnées dans vos échanges, documents et communications client.', (set, d) => <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Téléphone<input className={input} disabled={readOnly} value={d.phone} onChange={e => set('phone', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">E-mail de notification<input className={input} disabled={readOnly} value={d.notificationEmail} onChange={e => set('notificationEmail', e.target.value)} /></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Adresse<input className={input} disabled={readOnly} value={d.adressePro} onChange={e => set('adressePro', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">Code postal<input className={input} disabled={readOnly} value={d.cpPro} onChange={e => set('cpPro', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">Ville<input className={input} disabled={readOnly} value={d.villePro} onChange={e => set('villePro', e.target.value)} /></label></div>)}
    {panel('branding', 'Apparence de l’entreprise', 'Votre logo est repris dans les documents et espaces visibles par vos clients.', (set, d) => <div><label className="text-sm font-medium text-slate-700">Adresse du logo<input className={input} disabled={readOnly} value={d.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://…" /></label><p className="mt-2 text-xs text-slate-500">Utilisez une image déjà importée dans votre bibliothèque de marque.</p></div>)}
    {panel('legal', 'Informations légales', 'Ces informations sont utilisées dans vos documents commerciaux et contractuels.', (set, d) => <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">SIRET<input className={input} disabled={readOnly} value={d.siret} onChange={e => set('siret', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">Numéro de TVA<input className={input} disabled={readOnly} value={d.tvaNumber} onChange={e => set('tvaNumber', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">Assureur<input className={input} disabled={readOnly} value={d.assureur} onChange={e => set('assureur', e.target.value)} /></label><label className="text-sm font-medium text-slate-700">Numéro d’assurance<input className={input} disabled={readOnly} value={d.numAssurance} onChange={e => set('numAssurance', e.target.value)} /></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Mentions légales<textarea className={input} disabled={readOnly} value={d.devisMentionLegale} onChange={e => set('devisMentionLegale', e.target.value)} /></label></div>)}
    <p className="px-1 text-sm text-slate-500">Les coordonnées personnelles du membre connecté restent gérées hors de cette page afin de ne pas être modifiées à deux endroits.</p>
  </div>
}
