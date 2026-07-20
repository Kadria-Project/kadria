'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
  toKadriaAssistantPageContext,
  type AssistantPageContext,
} from '@/src/lib/kadria-assistant/page-context'
import { getShellContextFromPathname } from '@/src/components/workspace/shell/shell-context'

interface KadriaPageContextValue {
  pageContext: AssistantPageContext
  setPageContext: (value: AssistantPageContext) => void
}

const KadriaPageContextContext = createContext<KadriaPageContextValue | null>(null)

function buildDefaultPageContext(pathname?: string | null): AssistantPageContext {
  return toKadriaAssistantPageContext(getShellContextFromPathname(pathname))
}

export function KadriaPageContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const basePageContext = useMemo(() => buildDefaultPageContext(pathname), [pathname])
  const [enrichment, setEnrichment] = useState<{ pathname: string | null; value: AssistantPageContext } | null>(null)
  const pageContext = enrichment?.pathname === pathname ? enrichment.value : basePageContext

  const setPageContext = useCallback((next: AssistantPageContext) => {
    setEnrichment({ pathname, value: next })
  }, [pathname])

  const value = useMemo<KadriaPageContextValue>(
    () => ({
      pageContext,
      setPageContext,
    }),
    [pageContext, setPageContext],
  )

  return (
    <KadriaPageContextContext.Provider value={value}>
      {children}
    </KadriaPageContextContext.Provider>
  )
}

export function useKadriaPageContext() {
  const context = useContext(KadriaPageContextContext)
  if (!context) {
    throw new Error('useKadriaPageContext must be used within KadriaPageContextProvider')
  }
  return context
}

export function KadriaPageContextSync({ value }: { value: AssistantPageContext }) {
  const { setPageContext } = useKadriaPageContext()

  useEffect(() => {
    setPageContext(value)
  }, [setPageContext, value])

  return null
}
