'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProjectDecisionWorkspace from '@/src/components/projects/workspace/ProjectDecisionWorkspace'
import { PROJECT_WORKSPACE_REFRESH_EVENT, type ProjectWorkspaceBrief } from '@/src/lib/projects/project-workspace-contract'

type Response = { success: boolean; brief?: ProjectWorkspaceBrief; error?: string }

export default function ProjectWorkspaceRoute() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [brief, setBrief] = useState<ProjectWorkspaceBrief | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!id) return
    setState('loading')
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/workspace`, { cache: 'no-store', signal })
      const payload = await response.json().catch(() => null) as Response | null
      if (!response.ok || !payload?.success || !payload.brief) throw new Error(payload?.error || 'Lecture indisponible')
      setBrief(payload.brief)
      setState('ready')
    } catch { if (!signal?.aborted) setState('error') }
  }, [id])
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => { void load(controller.signal) }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [load])
  useEffect(() => {
    const refreshBrief = () => { void load() }
    window.addEventListener(PROJECT_WORKSPACE_REFRESH_EVENT, refreshBrief)
    return () => window.removeEventListener(PROJECT_WORKSPACE_REFRESH_EVENT, refreshBrief)
  }, [load])
  return <ProjectDecisionWorkspace brief={brief} loadState={state} onRefresh={load} onNavigate={(destination) => router.push(destination)} />
}
