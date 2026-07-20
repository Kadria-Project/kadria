'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline'

function ProjetContent() {
  const searchParams = useSearchParams()
  const artisanId = searchParams.get('artisan_id') ?? searchParams.get('artisanId') ?? ''

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#050505]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1120px] items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-[min(760px,calc(100dvh-48px))] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <ChatWidgetInline artisanId={artisanId} inline fitParentHeight />
        </div>
      </div>
    </main>
  )
}

export default function ProjetPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-zinc-950 text-zinc-400">Chargement...</div>}>
      <ProjetContent />
    </Suspense>
  )
}
