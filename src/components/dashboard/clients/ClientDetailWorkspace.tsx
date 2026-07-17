'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileText,
  FolderOpen,
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
  // Header CTA is intentionally the generic "open the active dossier" action —
  // the contextual action (confirm/relance/traiter) lives in the Prochaine
  // action card below so the same decision is never presented twice with the
  // same weight (§3, §13).
  const activeProject = projects.find((p) => p.statusGroup === 'active') || projects[0] || null
  const headerCta = activeProject ? { label: 'Ouvrir le dossier', href: activeProject.href } : null

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

      <Header client={client} commercial={commercialSummary} headerCta={headerCta} onNavigate={(href) => router.push(href)} />

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

function Header({ client, commercial, headerCta, onNavigate }: {
  client: ClientDetail['client']
  commercial: ClientDetail['commercialSummary']
  headerCta: { label: string; href: string | null } | null
  onNavigate: (href: string) => void
}) {
  const metaLine = [
    client.city,
    client.createdAt ? `Client depuis le ${dateLabel(client.createdAt)}` : null,
    commercial.lastInteractionAt ? `Dernière interaction ${relativeLabel(commercial.lastInteractionAt).toLowerCase()}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-700">
          {client.isCompany ? <Building2 className="size-6" aria-hidden="true" /> : initials(client.displayName)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-950">{client.displayName}</h1>
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{STATUS_LABELS[client.status] || client.status}</span>
            {client.isRecurring && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><RefreshCw className="size-3" aria-hidden="true" />Client récurrent</span>}
          </div>
          {client.contactName && <p className="mt-0.5 truncate text-sm text-slate-500">Contact : {client.contactName}</p>}
          <p className="mt-1 truncate text-sm text-slate-500">{metaLine || 'Coordonnées non renseignées'}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {client.phone && (
          <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700">
            <Phone className="size-4" aria-hidden="true" />Appeler
          </a>
        )}
        {client.email && (
          <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700">
            <Mail className="size-4" aria-hidden="true" />Écrire
          </a>
        )}
        {headerCta && headerCta.href && (
          <button type="button" onClick={() => headerCta.href && onNavigate(headerCta.href)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
            {headerCta.label}
          </button>
        )}
      </div>
    </header>
  )
}

function Kpi({ icon, label, value, detail, onClick }: { icon: React.ReactNode; label: string; value: string | number; detail?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={`flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm ${onClick ? 'cursor-pointer hover:border-emerald-200 hover:shadow-md' : ''}`}>
      <span className="mt-0.5 text-slate-300" aria-hidden="true">{icon}</span>
      <span className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-slate-950">{value}</p>
        {detail && <p className="truncate text-[11px] text-slate-500">{detail}</p>}
      </span>
    </button>
  )
}

function KpiRow({ summary, nextAppointment, onSelectTab }: { summary: ClientDetail['summary']; nextAppointment: ClientAppointment | null; onSelectTab: (tab: TabKey) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Kpi icon={<FolderOpen className="size-4" />} label="Dossiers" value={summary.projectCount} detail={summary.activeProjectCount > 0 ? `${summary.activeProjectCount} actif${summary.activeProjectCount > 1 ? 's' : ''}` : undefined} onClick={() => onSelectTab('projects')} />
      <Kpi icon={<FolderOpen className="size-4" />} label="Dossiers actifs" value={summary.activeProjectCount} onClick={() => onSelectTab('projects')} />
      <Kpi icon={<CheckCircle2 className="size-4" />} label="Chantiers gagnés" value={summary.wonProjectCount} onClick={() => onSelectTab('projects')} />
      <Kpi icon={<FileText className="size-4" />} label="Valeur gagnée" value={money(summary.acceptedAmount)} />
      <Kpi icon={<FileText className="size-4" />} label="Devis en attente" value={summary.pendingQuoteCount} onClick={() => onSelectTab('quotes')} />
      <Kpi
        icon={<CalendarClock className="size-4" />}
        label="Prochain RDV"
        value={nextAppointment ? dateLabel(nextAppointment.startTime) || '—' : 'Aucun'}
        detail={nextAppointment ? `${new Date(nextAppointment.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${CONFIRMATION_LABEL[nextAppointment.confirmationStatus] || 'À confirmer'}` : undefined}
        onClick={() => onSelectTab('appointments')}
      />
    </div>
  )
}

const NEXT_ACTION_PRIORITY_LABEL: Record<string, string> = { critical: 'Urgent', high: 'Prioritaire', medium: 'À traiter', low: 'À planifier' }
const NEXT_ACTION_PRIORITY_TONE: Record<string, string> = {
  critical: 'bg-rose-50 text-rose-700',
  high: 'bg-amber-50 text-amber-700',
  medium: 'bg-sky-50 text-sky-700',
  low: 'bg-slate-100 text-slate-600',
}

function NextActionCard({ nextAction, onNavigate }: { nextAction: ClientDetail['nextAction']; onNavigate: (href: string) => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Prochaine action">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Prochaine action</h2>
        {nextAction && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${NEXT_ACTION_PRIORITY_TONE[nextAction.priority] || 'bg-slate-100 text-slate-600'}`}>
            <AlertCircle className="size-3" aria-hidden="true" />{NEXT_ACTION_PRIORITY_LABEL[nextAction.priority] || nextAction.priority}
          </span>
        )}
      </div>
      {nextAction ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-950">{nextAction.label}</p>
            <p className="mt-1 text-sm text-slate-600">
              {[nextAction.projectTitle, nextAction.dueAt ? dateLabel(nextAction.dueAt, true) : null].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-1 text-sm text-slate-500">{nextAction.description}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {nextAction.href && (
              <button type="button" onClick={() => nextAction.href && onNavigate(nextAction.href)} className="rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                {nextAction.ctaLabel}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" aria-hidden="true" /><p>Aucun suivi urgent — la relation client est à jour.</p>
        </div>
      )}
    </section>
  )
}

function Overview({ nextAction, projects, quotes, timeline, onSeeAll, onNavigate }: {
  nextAction: ClientDetail['nextAction']; projects: ClientProjectSummary[]; quotes: ClientQuoteSummary[]; timeline: ClientTimelineEvent[]
  onSeeAll: (tab: TabKey) => void; onNavigate: (href: string) => void
}) {
  const attentionQuotes = quotes.filter((q) => q.status !== 'accepted' && q.status !== 'refuse').slice(0, 2)
  // §14: whichever of "quotes needing attention" / "recent interactions" has
  // more real content leads, so the timeline is never pushed far down by an
  // empty quotes block.
  const quotesFirst = attentionQuotes.length > 0 || timeline.length === 0

  const quotesBlock = (
    <SectionCard key="quotes" title="Devis nécessitant attention" onSeeAll={() => onSeeAll('quotes')} compact={attentionQuotes.length === 0}>
      {attentionQuotes.length === 0
        ? <EmptyState icon={<FileText className="size-4" aria-hidden="true" />} title="Aucun devis en attente" text="Tous les devis de ce client sont à jour." />
        : attentionQuotes.map((q) => <QuoteRow key={q.id} quote={q} onNavigate={onNavigate} />)}
    </SectionCard>
  )
  const interactionsBlock = (
    <SectionCard key="interactions" title="Dernières interactions" onSeeAll={() => onSeeAll('timeline')}>
      {timeline.length === 0
        ? <EmptyState icon={<CalendarClock className="size-4" aria-hidden="true" />} title="Aucune interaction enregistrée" text="L’historique s’enrichira automatiquement à la prochaine activité." />
        : <Timeline events={timeline.slice(0, 4)} onNavigate={onNavigate} />}
    </SectionCard>
  )

  return (
    <div className="space-y-6">
      <NextActionCard nextAction={nextAction} onNavigate={onNavigate} />

      <SectionCard title="Dossiers récents" onSeeAll={() => onSeeAll('projects')} compact={projects.length === 0}>
        {projects.length === 0
          ? <EmptyState icon={<FolderOpen className="size-4" aria-hidden="true" />} title="Aucun dossier associé" text="Ce client n’a pas encore de dossier ouvert." />
          : projects.slice(0, 3).map((p) => <ProjectRow key={p.id} project={p} onNavigate={onNavigate} />)}
      </SectionCard>

      {quotesFirst ? <>{quotesBlock}{interactionsBlock}</> : <>{interactionsBlock}{quotesBlock}</>}
    </div>
  )
}

function SectionCard({ title, onSeeAll, compact, children }: { title: string; onSeeAll?: () => void; compact?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
        {onSeeAll && <button type="button" onClick={onSeeAll} className="text-xs font-semibold text-emerald-700 hover:underline">Voir tout</button>}
      </div>
      <div className={compact ? 'mt-2' : 'mt-3 space-y-2'}>{children}</div>
    </section>
  )
}

// Compact empty state per §7: icon + short title + secondary text, no tall creuse card.
function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="truncate text-xs text-slate-500">{text}</p>
      </div>
    </div>
  )
}

function ProjectRow({ project, onNavigate }: { project: ClientProjectSummary; onNavigate: (href: string) => void }) {
  const nextMilestone = project.nextAppointmentAt
    ? `Prochain RDV ${dateLabel(project.nextAppointmentAt, true)}`
    : project.lastActivityAt
      ? `Dernière activité ${relativeLabel(project.lastActivityAt).toLowerCase()}`
      : null
  return (
    <button type="button" onClick={() => onNavigate(project.href)} className="flex w-full flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{project.title}</p>
          <p className="truncate text-xs text-slate-500">{project.status}{project.siteAddress ? ` · ${project.siteAddress}` : ''}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          {project.acceptedAmount !== null
            ? <span className="font-semibold text-slate-900">{money(project.acceptedAmount)}</span>
            : project.quoteCount > 0 && <span className="text-xs text-slate-500">{project.quoteCount} devis</span>}
          <span className="text-xs text-slate-500">{dateLabel(project.createdAt) || ''}</span>
        </div>
      </div>
      {nextMilestone && <p className="truncate text-[11px] text-slate-400">{nextMilestone}</p>}
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

const TIMELINE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  project_created: FolderOpen,
  project_updated: FolderOpen,
  activity: User,
  client_event: User,
  appointment: CalendarClock,
  quote: FileText,
}

function timelineGroupLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const diffDays = Math.floor((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000)
  if (diffDays === 0) return "Aujourd’hui"
  if (diffDays === 1) return 'Hier'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Real narrative timeline (§8): vertical line, icon + color per event, grouped
// by day, relative + absolute time. Color is never the only signal — icon and
// title always carry the meaning too (§18).
function Timeline({ events, onNavigate }: { events: ClientTimelineEvent[]; onNavigate: (href: string) => void }) {
  const groups: Array<{ label: string; items: ClientTimelineEvent[] }> = []
  for (const event of events) {
    const label = timelineGroupLabel(event.occurredAt)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(event)
    else groups.push({ label, items: [event] })
  }

  return (
    <ol className="space-y-4">
      {groups.map((group) => (
        <li key={group.label}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{group.label}</p>
          <ol className="space-y-3 border-l-2 border-slate-100 pl-5">
            {group.items.map((event) => {
              const Icon = TIMELINE_ICON[event.type] || AlertCircle
              const content = (
                <div className="relative min-w-0">
                  <span className={`absolute -left-[1.65rem] top-0 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-white ${TIMELINE_TONE[event.tone]}`}>
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[event.projectTitle, new Date(event.occurredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ')}
                    {' · '}{relativeLabel(event.occurredAt)}
                  </p>
                  {event.description && <p className="mt-0.5 truncate text-xs text-slate-400">{event.description}</p>}
                </div>
              )
              return (
                <li key={event.id}>
                  {event.href
                    ? <button type="button" onClick={() => onNavigate(event.href!)} className="w-full rounded-lg text-left transition hover:bg-slate-50">{content}</button>
                    : <div className="rounded-lg">{content}</div>}
                </li>
              )
            })}
          </ol>
        </li>
      ))}
    </ol>
  )
}

function ProjectsTab({ projects, filter, onFilter, onNavigate }: { projects: ClientProjectSummary[]; filter: 'all' | 'active' | 'won' | 'lost'; onFilter: (f: 'all' | 'active' | 'won' | 'lost') => void; onNavigate: (href: string) => void }) {
  const filtered = filter === 'all' ? projects : projects.filter((p) => p.statusGroup === filter)
  if (projects.length === 0) return <SectionCard title="Dossiers" compact><EmptyState icon={<FolderOpen className="size-4" aria-hidden="true" />} title="Aucun dossier associé" text="Ce client n’a pas encore de dossier ouvert." /></SectionCard>
  return (
    <SectionCard title="Tous les dossiers">
      <div className="mb-2 flex gap-2">
        {(['all', 'active', 'won', 'lost'] as const).map((key) => (
          <button key={key} type="button" onClick={() => onFilter(key)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${filter === key ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {{ all: 'Tous', active: 'Actifs', won: 'Gagnés', lost: 'Perdus' }[key]}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon={<FolderOpen className="size-4" aria-hidden="true" />} title="Aucun dossier pour ce filtre" text="Essayez un autre filtre de statut." /> : filtered.map((p) => <ProjectRow key={p.id} project={p} onNavigate={onNavigate} />)}
    </SectionCard>
  )
}

function QuotesTab({ quotes, onNavigate }: { quotes: ClientQuoteSummary[]; onNavigate: (href: string) => void }) {
  if (quotes.length === 0) return <SectionCard title="Devis" compact><EmptyState icon={<FileText className="size-4" aria-hidden="true" />} title="Aucun devis pour ce client" text="Aucun devis n’a encore été créé." /></SectionCard>
  return <SectionCard title={`Devis (${quotes.length})`}>{quotes.map((q) => <QuoteRow key={q.id} quote={q} onNavigate={onNavigate} />)}</SectionCard>
}

function AppointmentsTab({ appointments, onNavigate }: { appointments: ClientAppointment[]; onNavigate: (href: string) => void }) {
  if (appointments.length === 0) return <SectionCard title="Rendez-vous" compact><EmptyState icon={<CalendarClock className="size-4" aria-hidden="true" />} title="Aucun rendez-vous planifié" text="Aucun rendez-vous n’a encore été pris avec ce client." /></SectionCard>
  const upcoming = appointments.filter((a) => !a.isPast).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const past = appointments.filter((a) => a.isPast)
  return (
    <div className="space-y-6">
      <SectionCard title={`À venir (${upcoming.length})`} compact={upcoming.length === 0}>{upcoming.length === 0 ? <EmptyState icon={<CalendarClock className="size-4" aria-hidden="true" />} title="Aucun rendez-vous à venir" text="Rien de planifié pour le moment." /> : upcoming.map((a) => <AppointmentRow key={a.id} appointment={a} onNavigate={onNavigate} />)}</SectionCard>
      <SectionCard title={`Passés (${past.length})`} compact={past.length === 0}>{past.length === 0 ? <EmptyState icon={<CalendarClock className="size-4" aria-hidden="true" />} title="Aucun rendez-vous passé" text="Aucun historique de rendez-vous." /> : past.map((a) => <AppointmentRow key={a.id} appointment={a} onNavigate={onNavigate} />)}</SectionCard>
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
  if (timeline.length === 0) return <SectionCard title="Historique" compact><EmptyState icon={<CalendarClock className="size-4" aria-hidden="true" />} title="Aucun historique enregistré" text="L’historique s’enrichira automatiquement à la prochaine activité." /></SectionCard>
  return <SectionCard title={`Historique complet (${timeline.length})`}><Timeline events={timeline} onNavigate={onNavigate} /></SectionCard>
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
          <Calendar className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{appointment.title}</p>
            <p className="text-xs text-slate-500">{dateLabel(appointment.startTime, true)}</p>
            <p className="truncate text-xs text-slate-400">{appointment.projectTitle}</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${CONFIRMATION_TONE[appointment.confirmationStatus] || 'bg-slate-100 text-slate-600'}`}>{CONFIRMATION_LABEL[appointment.confirmationStatus] || 'À confirmer'}</span>
            <span className="mt-1.5 block text-xs font-semibold text-emerald-700">Ouvrir le dossier →</span>
          </div>
        </button>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Aucun rendez-vous planifié.</p>
      )}
    </div>
  )
}

function CommercialSummaryCard({ summary, commercial }: { summary: ClientDetail['summary']; commercial: ClientDetail['commercialSummary'] }) {
  const hasCommercialActivity = summary.totalQuotedAmount > 0 || summary.acceptedAmount > 0
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Synthèse commerciale</h2>
      <dl className="mt-3 space-y-2 text-sm">
        {hasCommercialActivity ? (
          <>
            <Row label="Valeur devisée" value={money(summary.totalQuotedAmount)} />
            <Row label="Valeur acceptée" value={money(summary.acceptedAmount)} />
            {commercial.conversionRate !== null && <Row label="Taux de conversion" value={`${Math.round(commercial.conversionRate * 100)}%`} />}
            {commercial.averageWonProjectValue !== null && <Row label="Panier moyen gagné" value={money(commercial.averageWonProjectValue)} />}
          </>
        ) : (
          <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-500">Aucune activité commerciale chiffrée pour l’instant.</p>
        )}
        {commercial.relationshipStartAt && <Row label="Client depuis" value={relativeLabel(commercial.relationshipStartAt)} />}
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
