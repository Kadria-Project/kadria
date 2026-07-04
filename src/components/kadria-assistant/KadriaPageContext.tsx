'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
  inferAssistantPageType,
  type AssistantPageContext,
} from '@/src/lib/kadria-assistant/page-context'

interface KadriaPageContextValue {
  pageContext: AssistantPageContext
  setPageContext: (value: AssistantPageContext) => void
}

const KadriaPageContextContext = createContext<KadriaPageContextValue | null>(null)

function buildDefaultPageContext(pathname?: string | null): AssistantPageContext {
  const pageType = inferAssistantPageType(pathname)
  if (pageType === 'project_detail' && pathname) {
    const projectId = pathname.split('/').filter(Boolean)[2]
    return {
      pageType,
      projectId: projectId || undefined,
    }
  }
  return { pageType }
}

export function KadriaPageContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [pageContext, setPageContext] = useState<AssistantPageContext>(() => buildDefaultPageContext(pathname))

  useEffect(() => {
    setPageContext(buildDefaultPageContext(pathname))
  }, [pathname])

  const value = useMemo<KadriaPageContextValue>(
    () => ({
      pageContext,
      setPageContext,
    }),
    [pageContext],
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
