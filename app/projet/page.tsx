'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline'

function ProjetContent() {
  const searchParams = useSearchParams()
  const artisanId = searchParams.get('artisan_id') ?? 'Artisan_demo'

  return (
    <main style={{
      height: '100dvh',
      width: '100vw',
      background: '#09090b',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header minimal */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #27272a',
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            color: '#22c55e',
            fontWeight: 800,
            fontSize: '18px',
            fontFamily: 'system-ui, sans-serif'
          }}>K</span>
          <span style={{
            color: 'white',
            fontWeight: 600,
            fontSize: '18px',
            fontFamily: 'system-ui, sans-serif'
          }}>adria</span>
        </div>
        <span style={{
          color: '#a1a1aa',
          fontSize: '12px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          Assistant de qualification projet
        </span>
      </div>

      {/* Chat pleine hauteur */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatWidgetInline
          artisanId={artisanId}
          inline={true}
          fullPage={true}
        />
      </div>
    </main>
  )
}

export default function ProjetPage() {
  return (
    <Suspense fallback={
      <div style={{
        background: '#09090b',
        height: '100dvh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#a1a1aa', fontFamily: 'system-ui' }}>
          Chargement...
        </div>
      </div>
    }>
      <ProjetContent />
    </Suspense>
  )
}
