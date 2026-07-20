'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationPerformanceProbe() {
  const pathname = usePathname()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.__kadriaNavigationAudit?.completeRoute(pathname)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pathname])

  return null
}
