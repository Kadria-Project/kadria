'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProjectWorkspace } from '@/src/components/projects/workspace/ProjectWorkspace'
import type { ProjectWorkspaceSections, ProjectWorkspaceTab } from '@/src/components/projects/workspace/ProjectWorkspace.types'
import type { ProjectWorkspaceSectionData, ProjectWorkspaceSectionKey } from '@/src/lib/projects/project-workspace-section-contract'
import { PROJECT_WORKSPACE_REFRESH_EVENT, type ProjectWorkspaceBrief } from '@/src/lib/projects/project-workspace-contract'
import { PortalActionAdapter } from '@/src/components/projects/workspace/actions/PortalActionAdapter'
import { PaymentActionAdapter } from '@/src/components/projects/workspace/actions/PaymentActionAdapter'
import { ReviewActionAdapter } from '@/src/components/projects/workspace/actions/ReviewActionAdapter'
import { SmsActionAdapter } from '@/src/components/projects/workspace/actions/SmsActionAdapter'
import { PdfActionAdapter } from '@/src/components/projects/workspace/actions/PdfActionAdapter'
import type { WorkspaceActionCapability, WorkspaceActionResult } from '@/src/components/projects/workspace/actions/workspace-action'
import { ProjectEditDialog } from '@/src/components/projects/workspace/dialogs/ProjectEditDialog'
import { AppointmentCreateDialog } from '@/src/components/projects/workspace/dialogs/AppointmentCreateDialog'
import { AppointmentEditDialog } from '@/src/components/projects/workspace/dialogs/AppointmentEditDialog'
import { AppointmentCancelDialog } from '@/src/components/projects/workspace/dialogs/AppointmentCancelDialog'
import { AppointmentAssignDialog } from '@/src/components/projects/workspace/dialogs/AppointmentAssignDialog'

type BriefResponse = { success: boolean; brief?: ProjectWorkspaceBrief; error?: string }
type SectionResponse<K extends ProjectWorkspaceSectionKey> = { success: boolean; data?: ProjectWorkspaceSectionData[K]; error?: string }
const initialSections: ProjectWorkspaceSections = { client: { status: 'not_loaded' }, documents: { status: 'not_loaded' }, commercial: { status: 'not_loaded' }, history: { status: 'not_loaded' }, engagement: { status: 'not_loaded' } }
const sectionForTab: Record<ProjectWorkspaceTab, ProjectWorkspaceSectionKey> = { activity: 'history', commercial: 'commercial', qualification: 'client', planning: 'engagement', documents: 'documents' }

export default function ProjectWorkspaceRoute() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [brief, setBrief] = useState<ProjectWorkspaceBrief | null>(null)
  const [briefState, setBriefState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>('activity')
  const [sections, setSections] = useState<ProjectWorkspaceSections>(initialSections)
  const [actionStates, setActionStates] = useState<Record<string, WorkspaceActionCapability['state']>>({ portal: 'available', payment: 'available', review: 'available', sms: 'available', pdf: 'available' })
  const [editInstance, setEditInstance] = useState(0)
  const [appointmentInstance, setAppointmentInstance] = useState(0)
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null)
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null)
  const [assigningAppointmentId, setAssigningAppointmentId] = useState<string | null>(null)

  const loadBrief = useCallback(async (signal?: AbortSignal) => {
    if (!id) return
    setBriefState('loading')
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/workspace`, { cache: 'no-store', signal })
      const payload = await response.json().catch(() => null) as BriefResponse | null
      if (!response.ok || !payload?.success || !payload.brief) throw new Error(payload?.error || 'Lecture indisponible')
      setBrief(payload.brief)
      setBriefState('ready')
    } catch { if (!signal?.aborted) setBriefState('error') }
  }, [id])

  const loadSection = useCallback(async <K extends ProjectWorkspaceSectionKey>(key: K) => {
    if (!id) return
    setSections((current) => ({ ...current, [key]: { status: 'loading' } }))
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/workspace/${key}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null) as SectionResponse<K> | null
      if (response.status === 403) { setSections((current) => ({ ...current, [key]: { status: 'unavailable', message: 'Accès non autorisé.' } })); return }
      if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.error || 'Lecture indisponible')
      const isEmpty = key === 'client' ? !Object.values(payload.data as ProjectWorkspaceSectionData['client']).some(Boolean) : key === 'documents' ? (payload.data as ProjectWorkspaceSectionData['documents']).items.length === 0 : key === 'commercial' ? (payload.data as ProjectWorkspaceSectionData['commercial']).quotes.length === 0 : key === 'history' ? (payload.data as ProjectWorkspaceSectionData['history']).events.length === 0 : key === 'engagement' ? (payload.data as ProjectWorkspaceSectionData['engagement']).appointments.length === 0 : false
      setSections((current) => ({ ...current, [key]: isEmpty ? { status: 'empty' } : { status: 'ready', data: payload.data } }))
    } catch (error) { setSections((current) => ({ ...current, [key]: { status: 'error', message: error instanceof Error ? error.message : 'Lecture indisponible.' } })) }
  }, [id])

  const openTab = useCallback((tab: ProjectWorkspaceTab) => { setActiveTab(tab); void loadSection(sectionForTab[tab]) }, [loadSection])
  useEffect(() => { const controller = new AbortController(); void loadBrief(controller.signal); return () => controller.abort() }, [loadBrief])
  useEffect(() => { const refreshBrief = () => { void loadBrief() }; window.addEventListener(PROJECT_WORKSPACE_REFRESH_EVENT, refreshBrief); return () => window.removeEventListener(PROJECT_WORKSPACE_REFRESH_EVENT, refreshBrief) }, [loadBrief])
  const executeAction = useCallback(async (key: 'portal' | 'payment' | 'review' | 'sms' | 'pdf', adapter: { execute: () => Promise<WorkspaceActionResult> }, refresh?: ProjectWorkspaceSectionKey) => {
    setActionStates((current) => ({ ...current, [key]: 'loading' }))
    const result = await adapter.execute().catch(() => ({ success: false, error: 'Erreur serveur.' } as WorkspaceActionResult))
    if (!result.success) { setActionStates((current) => ({ ...current, [key]: result.status === 403 ? 'forbidden' : 'error' })); return result }
    setActionStates((current) => ({ ...current, [key]: 'available' }))
    if (refresh) await loadSection(refresh)
    return result
  }, [loadSection])
  const capabilities = useMemo(() => ({
    openClientContact: { available: true, state: 'ready' as const, action: () => openTab('qualification') },
    openDocuments: { available: true, state: 'ready' as const, action: () => openTab('documents') },
    openCommercial: { available: true, state: 'ready' as const, action: () => openTab('commercial') },
    openHistory: { available: true, state: 'ready' as const, action: () => openTab('activity') },
    openEngagement: { available: true, state: 'ready' as const, action: () => openTab('planning') },
    portal: { state: actionStates.portal, execute: () => executeAction('portal', new PortalActionAdapter(id)) },
    payment: { state: actionStates.payment, execute: () => executeAction('payment', new PaymentActionAdapter(id), 'commercial') },
    review: { state: actionStates.review, execute: () => executeAction('review', new ReviewActionAdapter(id), 'history') },
    sms: { state: actionStates.sms, execute: () => executeAction('sms', new SmsActionAdapter(id), 'history') },
    pdf: { state: actionStates.pdf, execute: () => executeAction('pdf', new PdfActionAdapter(id)) },
    editProject: { state: 'available' as const, execute: async (): Promise<WorkspaceActionResult> => { setEditInstance((value) => value + 1); return { success: true } } },
    createAppointment: { state: 'available' as const, execute: async (): Promise<WorkspaceActionResult> => { setAppointmentInstance((value) => value + 1); return { success: true } } },
    editAppointment: { state: 'available' as const, execute: async (): Promise<WorkspaceActionResult> => ({ success: true }) },
    cancelAppointment: { state: 'available' as const, execute: async (): Promise<WorkspaceActionResult> => ({ success: true }) },
    assignAppointment: { state: 'available' as const, execute: async (): Promise<WorkspaceActionResult> => ({ success: true }) },
    openAgenda: { state: 'available' as const, execute: async (): Promise<WorkspaceActionResult> => { router.push('/dashboard-v2/agenda'); return { success: true } } },
  }), [actionStates, executeAction, id, openTab, router])

  if (briefState === 'error') return <section className="rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm text-amber-900">La lecture du dossier est momentanément indisponible.</p><button type="button" onClick={() => void loadBrief()} className="mt-3 text-sm font-semibold text-emerald-800">Réessayer</button></section>
  if (briefState === 'loading' || !brief) return <section aria-busy="true" className="rounded-xl border border-slate-200 bg-white p-5"><div className="h-5 w-36 animate-pulse rounded bg-slate-200" /><div className="mt-4 h-16 animate-pulse rounded bg-slate-100" /></section>
  const refreshAppointments = async (refreshBrief = true) => { await loadSection('engagement'); if (refreshBrief) await loadBrief(); if (sections.history.status === 'ready') await loadSection('history') }
  const selectedAppointment = sections.engagement.status === 'ready' ? sections.engagement.data.appointments.find((appointment) => appointment.id === (cancellingAppointmentId || assigningAppointmentId)) || null : null
  return <><ProjectWorkspace brief={brief} sections={sections} capabilities={capabilities} navigation={{ onBack: () => router.push('/dashboard-v2'), activeTab, onTabChange: openTab }} onEditAppointment={setEditingAppointmentId} onCancelAppointment={setCancellingAppointmentId} onAssignAppointment={setAssigningAppointmentId} />{editInstance > 0 && <ProjectEditDialog key={editInstance} projectId={id} onClose={() => setEditInstance(0)} onSaved={async () => { await loadBrief(); if (sections.client.status === 'ready') await loadSection('client'); if (sections.history.status === 'ready') await loadSection('history') }} />}{appointmentInstance > 0 && <AppointmentCreateDialog key={appointmentInstance} projectId={id} onClose={() => setAppointmentInstance(0)} onSaved={refreshAppointments} />}{editingAppointmentId && <AppointmentEditDialog projectId={id} appointmentId={editingAppointmentId} onClose={() => setEditingAppointmentId(null)} onSaved={refreshAppointments} />}{cancellingAppointmentId && <AppointmentCancelDialog projectId={id} appointmentId={cancellingAppointmentId} label={selectedAppointment?.label || 'ce rendez-vous'} onClose={() => setCancellingAppointmentId(null)} onSaved={refreshAppointments} />}{assigningAppointmentId && <AppointmentAssignDialog projectId={id} appointmentId={assigningAppointmentId} assignedUserId={selectedAppointment?.assigneeId || null} onClose={() => setAssigningAppointmentId(null)} onSaved={() => refreshAppointments(false)} />}</>
}
