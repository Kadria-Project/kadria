'use client'

import { useSearchParams } from 'next/navigation'
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline'

export default function WidgetEmbedContent() {
  const searchParams = useSearchParams()
  const artisanId = searchParams.get('artisan_id') || ''
  const primaryColor = searchParams.get('primary_color') || undefined

  return (
    <main style={{
      height: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#09090b',
    }}>
      <ChatWidgetInline
        artisanId={artisanId}
        inline={true}
        fullPage={true}
        primaryColor={primaryColor}
      />
    </main>
  )
}
