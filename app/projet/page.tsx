'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatWidgetInline, { type Dossier } from '@/src/components/chat/ChatWidgetInline'
import { KadriaLogo } from '@/src/components/KadriaLogo'

function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return `rgba(34,197,94,${alpha})`
  const r = parseInt(match[1], 16)
  const g = parseInt(match[2], 16)
  const b = parseInt(match[3], 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const SUMMARY_LABELS: { key: keyof Dossier; label: string }[] = [
  { key: 'projectType', label: 'Type de demande' },
  { key: 'aiSummary', label: 'Description' },
  { key: 'budget', label: 'Budget' },
  { key: 'desiredTimeline', label: 'Délai' },
]

function DossierSummary({ dossier, score, accentColor }: { dossier: Dossier; score: number; accentColor: string }) {
  const rows = SUMMARY_LABELS
    .map((item) => ({ label: item.label, value: dossier[item.key] }))
    .filter(
      (row): row is { label: string; value: string } =>
        typeof row.value === 'string' && row.value.trim().length > 0
    )
  const photoCount = dossier.photos?.length ?? 0
  const hasContact = Boolean(dossier.clientPhone || dossier.clientEmail)

  if (rows.length === 0 && photoCount === 0 && !hasContact) {
    return (
      <p style={{ margin: 0, color: '#71717a', fontSize: '13px', lineHeight: 1.6 }}>
        Votre résumé apparaîtra ici au fil de la conversation.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label}>
          <p style={{ margin: 0, color: '#71717a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {row.label}
          </p>
          <p style={{ margin: '2px 0 0', color: '#e4e4e7', fontSize: '13px', lineHeight: 1.5 }}>
            {row.value}
          </p>
        </div>
      ))}
      {photoCount > 0 && (
        <div>
          <p style={{ margin: 0, color: '#71717a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Photos
          </p>
          <p style={{ margin: '2px 0 0', color: '#e4e4e7', fontSize: '13px', lineHeight: 1.5 }}>
            {photoCount} photo{photoCount > 1 ? 's' : ''} ajoutée{photoCount > 1 ? 's' : ''}
          </p>
        </div>
      )}
      {hasContact && (
        <div>
          <p style={{ margin: 0, color: '#71717a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Coordonnées
          </p>
          <p style={{ margin: '2px 0 0', color: '#e4e4e7', fontSize: '13px', lineHeight: 1.5 }}>
            Renseignées
          </p>
        </div>
      )}
      <div className="mt-1" style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, score))}%`, background: accentColor, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function ProjetContent() {
  const searchParams = useSearchParams()
  // Accepte les deux conventions de nommage du paramètre (`artisan_id` est la
  // convention utilisée partout ailleurs — widget.js, /widget-embed — mais un
  // lien de test peut utiliser `artisanId`). Sans ce repli, un mauvais nom de
  // paramètre renvoie silencieusement une chaîne vide : /api/chat ne charge
  // alors plus du tout la configuration de l'artisan (ni ses métiers, ni ses
  // travaux acceptés/refusés), quel que soit l'artisan visé.
  const artisanId = searchParams.get('artisan_id') ?? searchParams.get('artisanId') ?? ''

  const [artisanName, setArtisanName] = useState('')
  const [dossier, setDossier] = useState<Dossier>({})
  const [score, setScore] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [accentColor, setAccentColor] = useState('#22c55e')

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
      <div className="mx-auto flex min-h-dvh w-full max-w-[1080px] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <header
          className="mb-3 flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 backdrop-blur sm:mb-4 sm:py-3"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'rgba(7,7,9,0.72)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <KadriaLogo size="sm" theme="dark" noLink />
            <div className="min-w-0">
              <p style={{ margin: 0, color: '#f4f4f5', fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {artisanName || 'Assistant projet'}
              </p>
              <p
                className="hidden sm:block"
                style={{ margin: 0, color: '#a1a1aa', fontSize: '12px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {artisanName ? 'Votre assistant de confiance pour vos travaux' : 'Aucun compte requis'}
              </p>
              <p
                className="sm:hidden"
                style={{ margin: 0, color: '#a1a1aa', fontSize: '12px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {artisanName ? 'Votre assistant de confiance' : 'Sans compte'}
              </p>
            </div>
          </div>
          <span
            style={{
              border: `1px solid ${hexToRgba(accentColor, 0.18)}`,
              background: hexToRgba(accentColor, 0.08),
              color: '#dcfce7',
              borderRadius: '999px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Demande guidée · 3 min
          </span>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
          <section className="min-h-[420px] sm:min-h-[640px] overflow-hidden rounded-[24px] lg:min-h-[760px] lg:order-1">
            <ChatWidgetInline
              artisanId={artisanId}
              inline={true}
              fullPage={true}
              projectExperience={true}
              onDossierChange={(d, s) => { setDossier(d); setScore(s) }}
              onArtisanNameChange={setArtisanName}
              onPrimaryColorChange={setAccentColor}
            />
          </section>

          <aside
            className="hidden rounded-2xl border p-4 lg:sticky lg:top-6 lg:order-2 lg:block"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              background: 'rgba(7,7,9,0.6)',
            }}
          >
            <p style={{ margin: '0 0 10px', color: '#f4f4f5', fontSize: '12.5px', fontWeight: 600 }}>
              Résumé de votre demande
            </p>
            <DossierSummary dossier={dossier} score={score} accentColor={accentColor} />
          </aside>
        </div>

        <details
          className="mt-4 rounded-[20px] border p-4 lg:hidden"
          open={summaryOpen}
          onToggle={(e) => setSummaryOpen((e.target as HTMLDetailsElement).open)}
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'rgba(7,7,9,0.72)',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              color: '#f4f4f5',
              fontSize: '13px',
              fontWeight: 600,
              listStyle: 'none',
            }}
          >
            Résumé de votre demande
          </summary>
          <div className="mt-3">
            <DossierSummary dossier={dossier} score={score} accentColor={accentColor} />
          </div>
        </details>
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
