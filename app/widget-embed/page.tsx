import { Suspense } from 'react'
import WidgetEmbedContent from './WidgetEmbedContent'

export default function WidgetEmbedPage() {
  return (
    <Suspense fallback={
      <div style={{
        height: '100vh', background: '#09090b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#a1a1aa',
        fontFamily: 'system-ui',
      }}>
        <div>Chargement...</div>
      </div>
    }>
      <WidgetEmbedContent />
    </Suspense>
  )
}
