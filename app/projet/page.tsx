'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline'

function ProjetContent() {
  const searchParams = useSearchParams()
  const artisanId = searchParams.get('artisan_id') ?? searchParams.get('artisanId') ?? ''
  const demoMode = searchParams.get('demoMode') === 'true'

  return (
    <main
      className="min-h-dvh w-full overflow-x-hidden"
      style={{
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.12), transparent 28%),
          radial-gradient(circle at 85% 20%, rgba(16,185,129,0.10), transparent 24%),
          linear-gradient(180deg, #050505 0%, #09090b 48%, #050505 100%)
        `,
      }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[1120px] items-center px-4 py-6 sm:px-6 lg:px-8">
        <div
          className="w-full overflow-hidden rounded-[16px]"
          style={{
            background: '#09090b',
            border: '1px solid #27272a',
            boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
            height: 'min(760px, calc(100dvh - 48px))',
          }}
        >
          <ChatWidgetInline
            artisanId={artisanId}
            inline
            fitParentHeight
            demoMode={demoMode}
          />
        </div>
      </div>
    </main>
  )
}

export default function ProjetPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            background: '#09090b',
            minHeight: '100dvh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a1a1aa',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Chargement...
        </div>
      }
    >
      <ProjetContent />
    </Suspense>
  )
}
