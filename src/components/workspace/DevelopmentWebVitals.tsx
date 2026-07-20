'use client'

import { useReportWebVitals } from 'next/web-vitals'

export default function DevelopmentWebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'development') return
    if (!['TTFB', 'FCP', 'LCP', 'CLS', 'INP'].includes(metric.name)) return
    console.info(`[PERF] web-vital=${metric.name} value=${Math.round(metric.value * 100) / 100} rating=${metric.rating}`)
  })

  return null
}
