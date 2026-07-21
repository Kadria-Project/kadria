'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
  enrichShellContext,
  getShellContextFromPathname,
  type ShellContextEnrichment,
  type ShellContextValue,
} from './shell-context'

type ScopedEnrichment = { scope: string; value: ShellContextEnrichment } | null

type ShellContextProviderValue = {
  shellContext: ShellContextValue
  setShellContextEnrichment: (value: ShellContextEnrichment | null) => void
  globalSearchOpen: boolean
  openGlobalSearch: () => void
  closeGlobalSearch: () => void
  quickCreateOpen: boolean
  openQuickCreate: () => void
  closeQuickCreate: () => void
}

const ShellContext = createContext<ShellContextProviderValue | null>(null)

function contextScope(context: ShellContextValue) {
  return `${context.route}:${context.entity?.type || ''}:${context.entity?.id || ''}`
}

export function ShellContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const baseContext = useMemo(() => getShellContextFromPathname(pathname), [pathname])
  const scope = contextScope(baseContext)
  const [enrichment, setEnrichment] = useState<ScopedEnrichment>(null)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)

  const setShellContextEnrichment = useCallback((value: ShellContextEnrichment | null) => {
    setEnrichment(value ? { scope, value } : null)
  }, [scope])

  const shellContext = useMemo(
    () => enrichShellContext(baseContext, enrichment?.scope === scope ? enrichment.value : null),
    [baseContext, enrichment, scope],
  )
  const value = useMemo(
    () => ({ shellContext, setShellContextEnrichment, globalSearchOpen, openGlobalSearch: () => { setQuickCreateOpen(false); setGlobalSearchOpen(true) }, closeGlobalSearch: () => setGlobalSearchOpen(false), quickCreateOpen, openQuickCreate: () => { setGlobalSearchOpen(false); setQuickCreateOpen(true) }, closeQuickCreate: () => setQuickCreateOpen(false) }),
    [shellContext, setShellContextEnrichment, globalSearchOpen, quickCreateOpen],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShellContext() {
  const context = useContext(ShellContext)
  if (!context) throw new Error('useShellContext must be used inside ShellContextProvider.')
  return context
}

export function ShellContextSync({ value }: { value: ShellContextEnrichment }) {
  const { setShellContextEnrichment } = useShellContext()

  // The effect owns this enrichment: navigating away or unmounting the page
  // always removes it, so an entity label cannot leak into another route.
  useEffect(() => {
    setShellContextEnrichment(value)
    return () => setShellContextEnrichment(null)
  }, [setShellContextEnrichment, value])

  return null
}
