import type { ReactNode } from 'react'

export default function PerformanceLayout({ children }: { children: ReactNode }) {
  return <section className="mx-auto w-full max-w-[1400px] space-y-4 pb-7">{children}</section>
}
