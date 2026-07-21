'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, CircleAlert, Loader2, Search, X } from 'lucide-react'
import AddressAutocomplete, { type AddressSelection } from '@/components/AddressAutocomplete'
import { ARTISAN_TRADES } from '@/src/config/trades'
import { getQualificationQuestionsForTrades, getSuggestedWorkTypesForTrades } from '@/src/config/trade-taxonomy'
import type { ProjectIntakeContract } from '@/src/lib/projects/intake-contract'

type Client = { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; address_line1: string | null; postal_code: string | null; city: string | null }
type Props = { onClose: () => void; onCreated: (route: string) => void }
type Form = Omit<ProjectIntakeContract, 'existingClientId'> & { existingClientId: string | null }
const empty: Form = { existingClientId: null, clientFirstName: '', clientName: '', clientPhone: '', clientEmail: '', siteAddress: '', city: '', postalCode: '', latitude: null, longitude: null, projectType: '', description: '', trade: '', tradeAnswers: [], budget: '', desiredTimeline: '', urgency: '', source: 'quick-create' }
const fieldClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
const sectionClass = 'rounded-xl border border-slate-200 bg-white p-4 sm:p-5'
const labelClass = 'block text-xs font-semibold text-slate-600'

export function ProjectIntakePanel({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<Form>(empty)
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const questions = useMemo(() => form.trade ? getQualificationQuestionsForTrades([form.trade], 3) : [], [form.trade])
  const workTypes = useMemo(() => form.trade ? getSuggestedWorkTypesForTrades([form.trade], 8) : [], [form.trade])
  const clientReady = Boolean(form.clientName && (form.clientPhone || form.clientEmail))
  const projectReady = Boolean(form.projectType || form.description)
  const addressReady = Boolean(form.siteAddress)
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (query.trim().length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try { const response = await fetch(`/api/clients/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }); const data = await response.json(); setClients(data.success && Array.isArray(data.clients) ? data.clients : []) } catch { if (!controller.signal.aborted) setClients([]) } finally { if (!controller.signal.aborted) setSearching(false) }
    }, 200)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query])

  function selectClient(client: Client) {
    setForm((current) => ({ ...current, existingClientId: client.id, clientFirstName: client.first_name || '', clientName: client.last_name || '', clientEmail: client.email || '', clientPhone: client.phone || '', siteAddress: client.address_line1 || current.siteAddress, postalCode: client.postal_code || current.postalCode, city: client.city || current.city }))
    setQuery(''); setClients([])
  }
  function selectAddress(selection: AddressSelection) { setForm((current) => ({ ...current, siteAddress: selection.address, city: selection.city || current.city, postalCode: selection.postalCode || current.postalCode, latitude: selection.latitude, longitude: selection.longitude })) }
  async function submit() {
    setError(''); setSaving(true)
    try {
      const response = await fetch('/api/projects/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok || !data.success) { setError(data.error || 'Impossible de créer le dossier.'); return }
      onCreated(data.route)
    } catch { setError('Connexion indisponible. Réessayez.'); } finally { setSaving(false) }
  }
  const summary = [{ label: 'Client', ready: clientReady, value: form.clientName ? [form.clientFirstName, form.clientName].filter(Boolean).join(' ') : 'Nom et contact requis' }, { label: 'Projet', ready: projectReady, value: form.projectType || form.description || 'Type ou description requis' }, { label: 'Adresse', ready: addressReady, value: form.siteAddress || 'Adresse du chantier requise' }, { label: 'Budget', ready: Boolean(form.budget), value: form.budget || 'À préciser' }, { label: 'Délai', ready: Boolean(form.desiredTimeline), value: form.desiredTimeline || 'À préciser' }]
  return <div className="max-h-[calc(100dvh-1rem)] overflow-y-auto bg-slate-50 p-4 sm:max-h-[calc(100vh-3rem)] sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-lg font-semibold text-slate-950">Nouveau dossier</p><p className="mt-1 text-sm text-slate-500">Complétez ce qui est utile maintenant.</p></div><button type="button" onClick={onClose} aria-label="Fermer le nouveau dossier" className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"><X className="size-4" /></button></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]"><div className="space-y-4">
      <details open className={sectionClass}><summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-950">Client <ChevronDown className="size-4 text-slate-400" /></summary><div className="mt-4 space-y-3"><label className={labelClass}>Rechercher un client existant<div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length < 2) setClients([]) }} className={`${fieldClass} pl-9`} placeholder="Nom, e-mail ou téléphone" />{(searching || clients.length > 0) && <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">{searching && <p className="p-3 text-sm text-slate-500">Recherche…</p>}{clients.map((client) => <button key={client.id} type="button" onClick={() => selectClient(client)} className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"><span className="font-medium text-slate-900">{[client.first_name, client.last_name].filter(Boolean).join(' ')}</span><span className="ml-2 text-slate-500">{client.email || client.phone || ''}</span></button>)}</div>}</div></label><div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Prénom<input value={form.clientFirstName} onChange={(event) => update('clientFirstName', event.target.value)} className={fieldClass} /></label><label className={labelClass}>Nom *<input value={form.clientName} onChange={(event) => { update('clientName', event.target.value); update('existingClientId', null) }} className={fieldClass} /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Téléphone<input value={form.clientPhone} onChange={(event) => update('clientPhone', event.target.value)} className={fieldClass} /></label><label className={labelClass}>E-mail<input type="email" value={form.clientEmail} onChange={(event) => update('clientEmail', event.target.value)} className={fieldClass} /></label></div></div></details>
      <details open className={sectionClass}><summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-950">Projet <ChevronDown className="size-4 text-slate-400" /></summary><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className={labelClass}>Métier<select value={form.trade} onChange={(event) => { update('trade', event.target.value); update('tradeAnswers', []) }} className={fieldClass}><option value="">Choisir</option>{ARTISAN_TRADES.map((trade) => <option key={trade.value} value={trade.value}>{trade.label}</option>)}</select></label><label className={labelClass}>Type de projet<input list="project-types" value={form.projectType} onChange={(event) => update('projectType', event.target.value)} className={fieldClass} placeholder="Ex. Rénovation" /><datalist id="project-types">{workTypes.map((type) => <option key={type} value={type} />)}</datalist></label><label className={`${labelClass} sm:col-span-2`}>Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} className={`${fieldClass} min-h-20`} placeholder="Besoin, contexte, contraintes…" /></label>{questions.map((question, index) => <label key={question} className={labelClass}>{question}<input value={form.tradeAnswers[index]?.answer || ''} onChange={(event) => { const answers = [...form.tradeAnswers]; answers[index] = { question, answer: event.target.value }; update('tradeAnswers', answers) }} className={fieldClass} /></label>)}<label className={labelClass}>Budget<input value={form.budget} onChange={(event) => update('budget', event.target.value)} className={fieldClass} placeholder="Ex. 5 000 €" /></label><label className={labelClass}>Délai<input value={form.desiredTimeline} onChange={(event) => update('desiredTimeline', event.target.value)} className={fieldClass} placeholder="Ex. Dans le mois" /></label><label className={labelClass}>Urgence<select value={form.urgency} onChange={(event) => update('urgency', event.target.value)} className={fieldClass}><option value="">À préciser</option><option value="urgent">Urgent</option><option value="normal">Normal</option><option value="faible">Faible</option></select></label><label className={labelClass}>Source<select value={form.source} onChange={(event) => update('source', event.target.value)} className={fieldClass}><option value="quick-create">Manuel</option><option value="phone">Téléphone</option><option value="email">E-mail</option><option value="recommendation">Recommandation</option></select></label></div></details>
      <details open className={sectionClass}><summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-950">Chantier <ChevronDown className="size-4 text-slate-400" /></summary><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className={`${labelClass} sm:col-span-2`}>Adresse *<AddressAutocomplete value={form.siteAddress} onChange={(value) => update('siteAddress', value)} onSelect={selectAddress} placeholder="Adresse du chantier" inputClassName="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label><label className={labelClass}>Ville<input value={form.city} onChange={(event) => update('city', event.target.value)} className={fieldClass} /></label><label className={labelClass}>Code postal<input value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} className={fieldClass} /></label></div></details>
    </div><aside className="order-first rounded-xl border border-emerald-100 bg-white p-4 lg:order-none lg:self-start"><p className="text-sm font-semibold text-slate-950">Vérification</p><div className="mt-3 space-y-3">{summary.map((item) => <div key={item.label} className="flex gap-2"><span className={item.ready ? 'text-emerald-600' : 'text-amber-500'}>{item.ready ? <Check className="size-4" /> : <CircleAlert className="size-4" />}</span><div className="min-w-0"><p className="text-xs font-semibold text-slate-700">{item.label}</p><p className="truncate text-xs text-slate-500">{item.value}</p></div></div>)}</div></aside></div>
    {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}<div className="mt-5 flex justify-end"><button type="button" onClick={() => void submit()} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{saving && <Loader2 className="size-4 animate-spin" />}{saving ? 'Création…' : 'Créer le dossier'}</button></div>
  </div>
}
