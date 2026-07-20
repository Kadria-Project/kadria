'use client'

import { useCallback, useEffect, useState } from 'react'
import TasksWorkspace from '@/src/components/workspace/tasks/TasksWorkspace'
import type { OperationsLoadState, TasksWorkspaceData } from '@/src/components/workspace/tasks/work-situations'

type Props = {
  firstName: string | null
}

type TasksResponse = {
  success: boolean
  tasksWorkspace?: TasksWorkspaceData
  error?: string
}

export default function TasksWorkspaceRoute({ firstName }: Props) {
  const [data, setData] = useState<TasksWorkspaceData | null>(null)
  const [loadState, setLoadState] = useState<OperationsLoadState>('loading')

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoadState('loading')
    try {
      const response = await fetch('/api/operations-center?scope=tasks', { cache: 'no-store', signal })
      const payload = await response.json().catch(() => null) as TasksResponse | null
      if (!response.ok || !payload?.success || !payload.tasksWorkspace) {
        throw new Error(payload?.error || 'Les actions à traiter sont indisponibles.')
      }
      setData(payload.tasksWorkspace)
      setLoadState('ready')
    } catch {
      if (signal?.aborted) return
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => { void load(controller.signal) }, 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [load])

  return <TasksWorkspace firstName={firstName} operationsCenter={data} loadState={loadState} onRefresh={load} />
}
