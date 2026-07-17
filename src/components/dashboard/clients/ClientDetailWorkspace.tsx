'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  User,
} from 'lucide-react'
import type {
  ClientAppointment,
  ClientDetail,
  ClientProjectSummary,
  ClientQuoteSummary,
  ClientTimelineEvent,
} from '@/src/lib/clients/client-detail-types'

type TabKey = 'overview' | 'projects' | 'quotes' | 'appointments' | 'timeline'
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Vue d’ensemble' },
  { key: 'projects', label: 'Dossiers' },
  { key: 'quotes', label: 'Devis' },
  { key: 'appointments', label: 'Rendez-vous' },
  { key: 'timeline', label: 'Historique' },
]

function money(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
function dateLabel(value: string | null, withTime = false) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + (withTime ? ` à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '')
}
function relativeLabel(value: string | null) {
  if (!value) return 'Aucune activité récente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Aucune activité récente'
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return "Aujourd’hui"
  if (days === 1) return 'Il y a 1 jour'
  if (days < 30) return `Il y a ${days} jours`
  return dateLabel(value) || ''
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'C'
}

const CONFIRMATION_TONE: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  change_requested: 'bg-orange-50 text-orange-700',
  cancelled: 'bg-rose-50 text-rose-600',
}
const CONFIRMATION_LABEL: Record<string, string> = {
  confirmed: 'Confirmé',
  pending: 'À confirmer',
  change_requested: 'Modification demandée',
  cancelled: 'Annulé',
}
const TIMELINE_TONE: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-500',
  info: 'bg-sky-100 text-sky-600',
  success: 'bg-emerald-100 text-emerald-600',
  warning: 'bg-amber-100 text-amber-600',
  danger: 'bg-rose-100 text-rose-600',
}
const STATUS_LABELS: Record<string, string> = { prospect: 'Prospect', customer: 'Client actif', follow_up: 'À relancer', lost: 'Perdu', archived: 'Archivé' }

export default function ClientDetailWorkspace({ clientId }: { clientId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabKey | null
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'overview'

  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState<'all' | 'active' | 'won' | 'lost'>('all')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/clients/${clientId}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (res.status === 404) { setNotFound(true); setError(null); return }
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de charger la fiche client.')
        setDetail(data.client as ClientDetail)
        setNotFound(false)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Impossible de charger la fiche client.')
      })
    return () => controller.abort()
  }, [clientId, reloadNonce])

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'overview') params.delete('tab'); else params.set('tab', next)
    router.replace(`/dashboard-v2/clients/${clientId}${params.toString() ? `?${params}` : ''}`, { scroll: false })
  }

  const copy = (field: string, value: string) => {
    navigator.clipboard?.writeText(value).then(() => { setCopiedField(field); setTimeout(() => setCopiedField((c) => (c === field ? null : c)), 1500) })
  }

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/dashboard-v2?tab=clients')
  }

  if (notFound) {
    return <ErrorState title="Client introuvable" message="Ce client n’existe pas ou n’est plus accessible depuis votre espace." onBack={goBack} />
  }
  if (error && !detail) {
    return <ErrorState title="Impossible de charger la fiche client" message={error} onRetry={() => setReloadNonce((n) => n + 1)} onBack={goBack} />
  }
  if (!detail) {
    return <DetailSkeleton />
  }

  const { client, summary, commercialSummary, nextAction, nextAppointment, projects, quotes, appointments, timeline } = detail
  const primaryCta = nextAction
    ? { label: nextAction.ctaLabel, href: nextAction.href }
    : projects.some((p) => p.statusGroup === 'active')
      ? { label: 'Ouvrir le dossier actif', href: projects.find((p) => p.statusGroup === 'active')?.href || null }
      : null

  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">
      <nav aria-label="Fil d’Ariane" className="flex items-center gap-2 text-sm text-slate-500">
        <span>Workspace</span><span>/</span>
        <button type="button" onClick={() => router.push('/dashboard-v2?tab=clients')} className="hover:text-emerald-700">Clients</button>
        <span>/</span><span className="truncate font-semibold text-slate-800">{client.displayName}</span>
      </nav>

      <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700">
        <ArrowLeft className="size-4" />Retour aux clients
      </button>

      <Header client={client} primaryCta={primaryCta} onNavigate={(href) => router.push(href)} />

      <KpiRow summary={summary} nextAppointment={nextAppointment} onSelectTab={setTab} />

      <div role="tablist" aria-label="Sections de la fiche client" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            id={`tab-${t.key}`}
            aria-controls={`panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-w-0 space-y-6">
          {tab === 'overview' && (
            <Overview
              nextAction={nextAction}
              projects={projects}
              quotes={quotes}
              timeline={timeline}
              onSeeAll={setTab}
              onNavigate={(href) => router.push(href)}
            />
          )}
          {tab === 'projects' && <ProjectsTab projects={projects} filter={projectFilter} onFilter={setProjectFilter} onNavigate={(href) => router.push(href)} />}
          {tab === 'quotes' && <QuotesTab quotes={quotes} onNavigate={(href) => router.push(href)} />}
          {tab === 'appointments' && <AppointmentsTab appointments={appointments} onNavigate={(href) => router.push(href)} />}
          {tab === 'timeline' && <TimelineTab timeline={timeline} onNavigate={(href) => router.push(href)} />}
        </div>

        <aside className="space-y-4">
          <ContactCard client={client} onCopy={copy} copiedField={copiedField} />
          <NextAppointmentCard appointment={nextAppointment} onNavigate={(href) => router.push(href)} />
          <CommercialSummaryCard summary={summary} commercial={commercialSummary} />
        </aside>
      </div>
    </section>
  )
}

function Header({ client, primaryCta, onNavigate }: { client: ClientDetail['client']; primaryCta: { label: string; href: string | null } | null; onNavigate: (href: string) => void }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-700">
          {client.isCompany ? <Building2 className="size-6" /> : initials(client.displayName)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-950">{client.displayName}</h1>
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{STATUS_LABELS[client.status] || client.status}</span>
            {client.isRecurring && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><RefreshCw className="size-3" />Client récurrent</span>}
          </div>
          {client.contactName && <p className="mt-0.5 truncate text-sm text-slate-500">Contact : {client.contactName}</p>}
          <p className="mt-1 truncate text-sm text-slate-500">
            {[client.city, client.createdAt ? `Client depuis le ${dateLabel(client.createdAt)}` : null].filter(Boolean).join(' · ') || 'Coordonnées non renseignées'}
          </p>
        </div>
      </div>
      {primaryCta && primaryCta.href && (
        <button type="button" onClick={() => primaryCta.href && onNavigate(primaryCta.href)} className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
          {primaryCta.label}
        </button>
      )}
    </header>
  )
}

function Kpi({ label, value, detail, onClick }: { label: string; value: string | number; detail?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={`rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm ${onClick ? 'cursor-pointer hover:border-emerald-200 hover:shadow-md' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-950">{value}</p>
      {detail && <p className="truncate text-[11px] text-slate-500">{detail}</p>}
    </button>
  )
}

function KpiRow({ summary, nextAppointment, onSelectTab }: { summary: ClientDetail['summary']; nextAppointment: ClientAppointment | null; onSelectTab: (tab: TabKey) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Kpi label="Dossiers" value={summary.projectCount} onClick={() => onSelectTab('projects')} />
      <Kpi label="Dossiers actifs" value={summary.activeProjectCount} />
      <Kpi label="Chantiers gagnés" value={summary.wonProjectCount} />
      <Kpi label="Valeur gagnée" value={money(summary.acceptedAmount)} />
      <Kpi label="Devis en attente" value={summary.pendingQuoteCount} onClick={() => onSelectTab('quotes')} />
      <Kpi label="Prochain RDV" value={nextAppointment ? dateLabel(nextAppointment.startTime) || '—' : 'Aucun'} onClick={() => onSelectTab('appointments')} />
    </div>
  )
}

function NextActionCard({ nextAction, onNavigate }: { nextAction: ClientDetail['nextAction']; onNavigate: (href: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Prochaine action</h2>
      {nextAction ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-950">{nextAction.label}</p>
            {nextAction.projectTitle && <p className="mt-0.5 text-sm text-slate-500">Dossier : {nextAction.projectTitle}</p>}
            {nextAction.dueAt && <p className="mt-0.5 text-sm text-slate-500">Échéance : {dateLabel(nextAction.dueAt, true)}</p>}
          </div>
          {nextAction.href && <button type="button" onClick={() => nextAction.href && onNavigate(nextAction.href)} className="shrink-0 rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{nextAction.ctaLabel}</button>}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" /><p>Aucun suivi urgent — la relation client est à jour.</p>
        </div>
      )}
    </div>
  )
}

function Overview({ nextAction, projects, quotes, timeline, onSeeAll, onNavigate }: {
  nextAction: ClientDetail['nextAction']; projects: ClientProjectSummary[]; quotes: ClientQuoteSummary[]; timeline: ClientTimelineEvent[]
  onSeeAll: (tab: TabKey) => void; onNavigate: (href: string) => void
}) {
  const attentionQuotes = quotes.filter((q) => q.status !== 'accepted' && q.status !== 'refuse').slice(0, 2)
  return (
    <div className="space-y-6">
      <NextActionCard nextAction={nextAction} onNavigate={onNavigate} />

      <SectionCard title="Dossiers récents" onSeeAll={() => onSeeAll('projects')}>
        {projects.length === 0 ? <EmptyRow text="Aucun dossier associé." /> : projects.slice(0, 3).map((p) => <ProjectRow key={p.id} project={p} onNavigate={onNavigate} />)}
      </SectionCard>

      <SectionCard title="Devis nécessitant attention" onSeeAll={() => onSeeAll('quotes')}>
        {attentionQuotes.length === 0 ? <EmptyRow text="Aucun devis en attente." /> : attentionQuotes.map((q) => <QuoteRow key={q.id} quote={q} onNavigate={onNavigate} />)}
      </SectionCard>

      <SectionCard title="Dernières interactions" onSeeAll={() => onSeeAll('timeline')}>
        {timeline.length === 0 ? <EmptyRow text="Aucune interaction enregistrée." /> : timeline.slice(0, 3).map((event) => <TimelineRow key={event.id} event={event} onNavigate={onNavigate} />)}
      </SectionCard>
    </div>
  )
}

function SectionCard({ title, onSeeAll, children }: { title: string; onSeeAll?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
        {onSeeAll && <button type="button" onClick={onSeeAll} className="text-xs font-semibold text-emerald-700 hover:underline">Voir tout</button>}
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}

function EmptyRow({ text }: { text: string }) { return <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">{text}</p> }

function ProjectRow({ project, onNavigate }: { project: ClientProjectSummary; onNavigate: (href: string) => void }) {
  return (
    <button type="button" onClick={() => onNavigate(project.href)} className="flex w-full flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{project.title}</p>
        <p className="truncate text-xs text-slate-500">{project.status}{project.siteAddress ? ` · ${project.siteAddress}` : ''}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        {project.acceptedAmount !== null && <span className="font-semibold text-slate-900">{money(project.acceptedAmount)}</span>}
        <span className="text-xs text-slate-500">{dateLabel(project.createdAt) || ''}</span>
      </div>
    </button>
  )
}

function QuoteRow({ quote, onNavigate }: { quote: ClientQuoteSummary; onNavigate: (href: string) => void }) {
  return (
    <button type="button" onClick={() => onNavigate(quote.href)} className="flex w-full flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{quote.numero || 'Devis'} — {quote.projectTitle}</p>
        <p className="truncate text-xs text-slate-500">{quote.statusLabel}{quote.sentAt ? ` · envoyé le ${dateLabel(quote.sentAt)}` : ''}</p>
      </div>
      <span className="shrink-0 font-semibold text-slate-900">{money(quote.totalTtc)}</span>
    </button>
  )
}

function TimelineRow({ event, onNavigate }: { event: ClientTimelineEvent; onNavigate: (href: string) => void }) {
  const content = (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${TIMELINE_TONE[event.tone]}`} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
        <p className="truncate text-xs text-slate-500">{[event.projectTitle, dateLabel(event.occurredAt, true)].filter(Boolean).join(' · ')}</p>
        {event.description && <p className="mt-0.5 truncate text-xs text-slate-400">{event.description}</p>}
      </div>
    </div>
  )
  if (!event.href) return <div className="rounded-lg px-1 py-1.5">{content}</div>
  return <button type="button" onClick={() => onNavigate(event.href!)} className="w-full rounded-lg px-1 py-1.5 text-left transition hover:bg-slate-50">{content}</button>
}

function ProjectsTab({ projects, filter, onFilter, onNavigate }: { projects: ClientProjectSummary[]; filter: 'all' | 'active' | 'won' | 'lost'; onFilter: (f: 'all' | 'active' | 'won' | 'lost') => void; onNavigate: (href: string) => void }) {
  const filtered = filter === 'all' ? projects : projects.filter((p) => p.statusGroup === filter)
  if (projects.length === 0) return <SectionCard title="Dossiers"><EmptyRow text="Aucun dossier associé à ce client." /></SectionCard>
  return (
    <SectionCard title="Tous les dossiers">
      <div className="mb-2 flex gap-2">
        {(['all', 'active', 'won', 'lost'] as const).map((key) => (
          <button key={key} type="button" onClick={() => onFilter(key)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${filter === key ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {{ all: 'Tous', active: 'Actifs', won: 'Gagnés', lost: 'Perdus' }[key]}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyRow text="Aucun dossier pour ce filtre." /> : filtered.map((p) => <ProjectRow key={p.id} project={p} onNavigate={onNavigate} />)}
    </SectionCard>
  )
}

function QuotesTab({ quotes, onNavigate }: { quotes: ClientQuoteSummary[]; onNavigate: (href: string) => void }) {
  if (quotes.length === 0) return <SectionCard title="Devis"><EmptyRow text="Aucun devis pour ce client." /></SectionCard>
  return <SectionCard title={`Devis (${quotes.length})`}>{quotes.map((q) => <QuoteRow key={q.id} quote={q} onNavigate={onNavigate} />)}</SectionCard>
}

function AppointmentsTab({ appointments, onNavigate }: { appointments: ClientAppointment[]; onNavigate: (href: string) => void }) {
  if (appointments.length === 0) return <SectionCard title="Rendez-vous"><EmptyRow text="Aucun rendez-vous planifié." /></SectionCard>
  const upcoming = appointments.filter((a) => !a.isPast).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const past = appointments.filter((a) => a.isPast)
  return (
    <div className="space-y-6">
      <SectionCard title={`À venir (${upcoming.length})`}>{upcoming.length === 0 ? <EmptyRow text="Aucun rendez-vous à venir." /> : upcoming.map((a) => <AppointmentRow key={a.id} appointment={a} onNavigate={onNavigate} />)}</SectionCard>
      <SectionCard title={`Passés (${past.length})`}>{past.length === 0 ? <EmptyRow text="Aucun rendez-vous passé." /> : past.map((a) => <AppointmentRow key={a.id} appointment={a} onNavigate={onNavigate} />)}</SectionCard>
    </div>
  )
}

function AppointmentRow({ appointment, onNavigate }: { appointment: ClientAppointment; onNavigate: (href: string) => void }) {
  return (
    <button type="button" onClick={() => onNavigate(appointment.href)} className="flex w-full flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{appointment.title}</p>
        <p className="truncate text-xs text-slate-500">{appointment.projectTitle} · {dateLabel(appointment.startTime, true)}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONFIRMATION_TONE[appointment.confirmationStatus] || 'bg-slate-100 text-slate-600'}`}>
        {CONFIRMATION_LABEL[appointment.confirmationStatus] || 'À confirmer'}
      </span>
    </button>
  )
}

function TimelineTab({ timeline, onNavigate }: { timeline: ClientTimelineEvent[]; onNavigate: (href: string) => void }) {
  if (timeline.length === 0) return <SectionCard title="Historique"><EmptyRow text="Aucun historique enregistré pour ce client." /></SectionCard>
  return <SectionCard title={`Historique complet (${timeline.length})`}>{timeline.map((event) => <TimelineRow key={event.id} event={event} onNavigate={onNavigate} />)}</SectionCard>
}

function ContactCard({ client, onCopy, copiedField }: { client: ClientDetail['client']; onCopy: (field: string, value: string) => void; copiedField: string | null }) {
  const address = [client.addressLine1, client.addressLine2, [client.postalCode, client.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Coordonnées</h2>
      <div className="mt-3 space-y-2 text-sm">
        <ContactRow icon={<User className="size-4" />} label={client.contactName || client.displayName} />
        <ContactRow icon={<Phone className="size-4" />} label={client.phone} href={client.phone ? `tel:${client.phone}` : null} onCopy={client.phone ? () => onCopy('phone', client.phone!) : undefined} copied={copiedField === 'phone'} empty="Téléphone non renseigné" />
        <ContactRow icon={<Mail className="size-4" />} label={client.email} href={client.email ? `mailto:${client.email}` : null} onCopy={client.email ? () => onCopy('email', client.email!) : undefined} copied={copiedField === 'email'} empty="Email non renseigné" />
        <ContactRow icon={<MapPin className="size-4" />} label={address || null} onCopy={address ? () => onCopy('address', address) : undefined} copied={copiedField === 'address'} empty="Adresse non renseignée" />
      </div>
    </div>
  )
}

function ContactRow({ icon, label, href, onCopy, copied, empty }: { icon: React.ReactNode; label: string | null; href?: string | null; onCopy?: () => void; copied?: boolean; empty?: string }) {
  if (!label) return <div className="flex items-center gap-2 text-slate-400"><span className="text-slate-300">{icon}</span><span>{empty || 'Non renseigné'}</span></div>
  return (
    <div className="flex items-center gap-2 text-slate-700">
      <span className="text-slate-400">{icon}</span>
      {href ? <a href={href} className="truncate font-medium hover:text-emerald-700">{label}</a> : <span className="truncate font-medium">{label}</span>}
      {onCopy && (
        <button type="button" onClick={onCopy} aria-label={`Copier ${label}`} className="ml-auto shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          {copied ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </div>
  )
}

function NextAppointmentCard({ appointment, onNavigate }: { appointment: ClientAppointment | null; onNavigate: (href: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Prochain rendez-vous</h2>
      {appointment ? (
        <button type="button" onClick={() => onNavigate(appointment.href)} className="mt-3 flex w-full items-start gap-2 rounded-lg text-left hover:bg-slate-50">
          <Calendar className="mt-0.5 size-4 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{appointment.title}</p>
            <p className="text-xs text-slate-500">{dateLabel(appointment.startTime, true)}</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${CONFIRMATION_TONE[appointment.confirmationStatus] || 'bg-slate-100 text-slate-600'}`}>{CONFIRMATION_LABEL[appointment.confirmationStatus] || 'À confirmer'}</span>
          </div>
        </button>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Aucun rendez-vous planifié.</p>
      )}
    </div>
  )
}

function CommercialSummaryCard({ summary, commercial }: { summary: ClientDetail['summary']; commercial: ClientDetail['commercialSummary'] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Synthèse commerciale</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Valeur devisée" value={money(summary.totalQuotedAmount)} />
        <Row label="Valeur acceptée" value={money(summary.acceptedAmount)} />
        {commercial.conversionRate !== null && <Row label="Taux de conversion" value={`${Math.round(commercial.conversionRate * 100)}%`} />}
        {commercial.averageWonProjectValue !== null && <Row label="Panier moyen gagné" value={money(commercial.averageWonProjectValue)} />}
        <Row label="Dernière interaction" value={relativeLabel(commercial.lastInteractionAt)} />
      </dl>
    </div>
  )
}
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value}</dd></div> }

function ErrorState({ title, message, onRetry, onBack }: { title: string; message: string; onRetry?: () => void; onBack: () => void }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
      <p className="font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
      <div className="mt-4 flex justify-center gap-2">
        {onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white"><RefreshCw className="size-4" />Réessayer</button>}
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Retour aux clients</button>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>
      <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      </div>
    </section>
  )
}
