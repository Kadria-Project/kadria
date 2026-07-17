'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Search, SearchX } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import type { ClientListItem, ClientListResponse } from '@/src/lib/clients/client-list-types'
import { CLIENT_ATTENTION_LABELS, buildClientListSearchParams, type ClientListUiFilter, type ClientListUiSort } from '@/src/lib/clients/client-list-ui'

type ClientFilter = ClientListUiFilter
type SortKey = ClientListUiSort

const FILTERS: Array<{ value: ClientFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'canonical', label: 'Clients liés' },
  { value: 'legacy', label: 'À rapprocher' },
  { value: 'attention', label: 'À traiter' },
  { value: 'active', label: 'Actifs' },
  { value: 'recurring', label: 'Clients récurrents' },
]

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  customer: 'Client',
  follow_up: 'À relancer',
  lost: 'Perdu',
  archived: 'Archivé',
  legacy: 'Legacy',
}

function formatAmount(value: number) {
  return value > 0 ? value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function ClientBadges({ client }: { client: ClientListItem }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">
        {STATUS_LABELS[client.status] || 'Client'}
      </span>
      {client.source === 'legacy' && (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">Legacy</span>
      )}
      {client.needsAttention && client.attentionReason && (
        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-500">
          {CLIENT_ATTENTION_LABELS[client.attentionReason] || 'À traiter'}
        </span>
      )}
    </span>
  )
}

function ClientRow({ client, onOpen }: { client: ClientListItem; onOpen: (client: ClientListItem) => void }) {
  const canOpen = Boolean(client.latestProject)
  return (
    <button
      type="button"
      onClick={() => onOpen(client)}
      disabled={!canOpen}
      className="w-full border-b border-[var(--border)]/50 bg-[var(--bg-elevated)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:hover:bg-[var(--bg-elevated)] md:px-4"
    >
      <span className="hidden grid-cols-12 items-center gap-4 md:grid">
        <span className="col-span-2 min-w-0">
          <span className="flex items-center gap-2 font-medium text-[var(--text-1)]">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--border)] text-xs font-bold">
              {client.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </span>
            <span className="min-w-0 truncate">{client.displayName}</span>
          </span>
          {client.companyName && client.companyName !== client.displayName && <span className="mt-1 block truncate text-xs text-[var(--text-3)]">{client.companyName}</span>}
          <span className="mt-1 block truncate text-xs text-[var(--text-3)]">{client.city || 'Ville non renseignée'}</span>
          <span className="mt-1"><ClientBadges client={client} /></span>
        </span>
        <span className="col-span-2 min-w-0 text-[var(--text-2)]">
          <span className="block truncate">{client.email || 'Email non renseigné'}</span>
          <span className="block truncate text-xs text-[var(--text-3)]">{client.phone || 'Téléphone non renseigné'}</span>
        </span>
        <span className="col-span-2 min-w-0 text-[var(--text-2)]">
          <span className="block truncate">{client.latestProject?.title || 'Aucun dossier'}</span>
          <span className="block truncate text-xs text-[var(--text-3)]">{client.latestProject ? `${client.projectCount} dossier(s)` : 'Client sans projet'}</span>
        </span>
        <span className="col-span-2 min-w-0 text-[var(--text-2)]">
          <span className="block truncate">{client.nextAppointment?.title || 'Aucun rendez-vous'}</span>
          <span className="block text-xs text-[var(--text-3)]">{formatDate(client.nextAppointment?.startTime || null)}</span>
        </span>
        <span className="col-span-2 text-[var(--text-2)]">{formatAmount(client.acceptedAmount)}</span>
        <span className="col-span-1 min-w-0 text-xs text-[var(--text-2)]">{client.lastInteractionLabel || '—'}</span>
        <ChevronRight className="col-span-1 ml-auto size-4 text-[var(--text-3)]" />
      </span>
      <span className="flex items-start gap-3 md:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--border)] text-xs font-bold text-[var(--text-1)]">
          {client.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2"><span className="font-medium text-[var(--text-1)]">{client.displayName}</span><ClientBadges client={client} /></span>
          <span className="mt-1 block truncate text-xs text-[var(--text-2)]">{client.email || client.phone || 'Contact non renseigné'}</span>
          <span className="mt-1 block truncate text-xs text-[var(--text-2)]">{client.latestProject?.title || 'Aucun dossier'} · {client.projectCount} dossier(s)</span>
          <span className="mt-1 block text-xs text-[var(--text-3)]">{client.nextAppointment ? `Rendez-vous : ${formatDate(client.nextAppointment.startTime)}` : 'Aucun rendez-vous'} · {formatAmount(client.acceptedAmount)}</span>
        </span>
        {canOpen && <ChevronRight className="mt-1 size-4 shrink-0 text-[var(--text-3)]" />}
      </span>
    </button>
  )
}

export default function ClientsV2List({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
  const [filter, setFilter] = useState<ClientFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('attention')
  const [status, setStatus] = useState('')
  const [hasAppointment, setHasAppointment] = useState<boolean | undefined>()
  const [includeArchived, setIncludeArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [response, setResponse] = useState<ClientListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const requestRef = useRef(0)

  const resetResponse = () => {
    setResponse(null)
    setError(null)
  }

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
    resetResponse()
  }, 350)

  useEffect(() => {
    const requestId = ++requestRef.current
    const controller = new AbortController()
    fetch(`/api/clients?${buildClientListSearchParams(filter, search, page, sort, { status, hasAppointment, includeArchived }).toString()}`, { signal: controller.signal })
      .then(async (result) => {
        const data = await result.json() as ({ success: false; error?: string } | ({ success: true } & ClientListResponse))
        if (!result.ok || !data.success) throw new Error(('error' in data ? data.error : undefined) || 'Impossible de charger les clients.')
        if (requestId === requestRef.current) setResponse(data)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || requestId !== requestRef.current) return
        setError(reason instanceof Error ? reason.message : 'Impossible de charger les clients.')
        setResponse(null)
      })
    return () => controller.abort()
  }, [filter, hasAppointment, includeArchived, page, reloadNonce, search, sort, status])

  const changeFilter = (value: ClientFilter) => {
    setFilter(value)
    setPage(1)
    resetResponse()
  }
  const changeStatus = (value: string) => {
    setStatus(value)
    setPage(1)
    resetResponse()
  }
  const changeHasAppointment = (value: string) => {
    setHasAppointment(value === 'all' ? undefined : value === 'yes')
    setPage(1)
    resetResponse()
  }
  const totalPages = response ? Math.max(1, Math.ceil(response.total / response.pageSize)) : 1
  const loading = response === null && error === null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-3)]" /><input value={searchInput} onChange={(event) => { const value = event.target.value; setSearchInput(value); debouncedSearch(value) }} placeholder="Nom, e-mail, téléphone, ville..." className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] pl-9 pr-3 text-sm text-[var(--text-1)] outline-none focus:border-green-500" /></label>
        <select value={filter} onChange={(event) => changeFilter(event.target.value as ClientFilter)} className="h-11 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-1)]">
          {FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select value={status || 'all'} onChange={(event) => changeStatus(event.target.value === 'all' ? '' : event.target.value)} className="h-11 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-1)]">
          <option value="all">Tous les statuts</option><option value="prospect">Prospects</option><option value="customer">Clients</option><option value="follow_up">À relancer</option><option value="lost">Perdus</option>
        </select>
        <select value={hasAppointment === undefined ? 'all' : hasAppointment ? 'yes' : 'no'} onChange={(event) => changeHasAppointment(event.target.value)} className="h-11 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-1)]">
          <option value="all">Tous les rendez-vous</option><option value="yes">Avec rendez-vous</option><option value="no">Sans rendez-vous</option>
        </select>
        <select value={sort} onChange={(event) => { setSort(event.target.value as SortKey); setPage(1); resetResponse() }} className="h-11 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-1)]">
          <option value="attention">À traiter d’abord</option><option value="lastInteraction">Dernière interaction</option><option value="name">Nom</option><option value="acceptedValue">Valeur acceptée</option><option value="projectCount">Nombre de dossiers</option><option value="nextAppointment">Prochain rendez-vous</option>
        </select>
        <label className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-2)]"><input type="checkbox" checked={includeArchived} onChange={(event) => { setIncludeArchived(event.target.checked); setPage(1); resetResponse() }} />Archivés</label>
      </div>
      {response && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Kpi label="Clients" value={response.summary.totalClients} /><Kpi label="Actifs" value={response.summary.activeClients} /><Kpi label="À traiter" value={response.summary.attentionCount} /><Kpi label="Valeur acceptée" value={formatAmount(response.summary.totalAcceptedValue)} /></div>}
      {loading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-[var(--bg-hover)]" />)}</div>}
      {!loading && error && <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center"><p className="font-semibold text-[var(--text-1)]">Impossible de charger les clients</p><p className="mt-1 text-sm text-[var(--text-2)]">{error}</p><button type="button" onClick={() => { resetResponse(); setReloadNonce((current) => current + 1) }} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-1)]"><RefreshCw className="size-4" />Réessayer</button></div>}
      {!loading && !error && response?.items.length === 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-10 text-center"><SearchX className="mx-auto mb-3 size-10 text-[var(--text-3)]" /><p className="font-bold text-[var(--text-1)]">{search ? 'Aucun résultat' : 'Aucun client pour le moment'}</p><p className="mt-1 text-sm text-[var(--text-2)]">{search ? `Aucun client ne correspond à « ${search} ». ` : 'Les clients et dossiers apparaîtront ici.'}</p></div>}
      {!loading && !error && response && response.items.length > 0 && <div><div className="mb-2 text-sm text-[var(--text-2)]">{response.total} client(s) trouvé(s)</div><div className="hidden grid-cols-12 gap-4 rounded-t-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-[11px] uppercase tracking-widest text-[var(--text-3)] md:grid"><span className="col-span-2">Client</span><span className="col-span-2">Contact</span><span className="col-span-2">Dernier dossier</span><span className="col-span-2">Prochain rendez-vous</span><span className="col-span-2">Valeur acceptée</span><span className="col-span-1">Interaction</span><span className="col-span-1" /></div><div className="overflow-hidden rounded-b-xl border-x border-b border-[var(--border)]">{response.items.map((client) => <ClientRow key={client.id} client={client} onOpen={(item) => { if (item.latestProject) onOpenProject(item.latestProject.id) }} />)}</div>{totalPages > 1 && <div className="mt-4 flex items-center justify-between"><button type="button" disabled={response.page <= 1} onClick={() => { resetResponse(); setPage((current) => Math.max(1, current - 1)) }} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="size-4" />Précédent</button><span className="text-sm text-[var(--text-2)]">Page {response.page} sur {totalPages}</span><button type="button" disabled={response.page >= totalPages} onClick={() => { resetResponse(); setPage((current) => current + 1) }} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40">Suivant<ChevronRight className="size-4" /></button></div>}</div>}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{label}</p><p className="mt-1 text-base font-bold text-[var(--text-1)]">{value}</p></div>
}
