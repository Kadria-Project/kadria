'use client'

import { useReportWebVitals } from 'next/web-vitals'

export const webVitalsEnabled = () => process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_KADRIA_PERF_DEBUG === '1'

export default function DevelopmentWebVitals() {
  useReportWebVitals((metric) => {
    if (!webVitalsEnabled()) return
    if (!['TTFB', 'FCP', 'LCP', 'CLS', 'INP'].includes(metric.name)) return
    console.info(`[PERF] web-vital=${metric.name} value=${Math.round(metric.value * 100) / 100} rating=${metric.rating}`)
  })

  return null
}
