'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatWidgetInline, { type Dossier } from '@/src/components/chat/ChatWidgetInline'
import { KadriaLogo } from '@/src/components/KadriaLogo'

const SUMMARY_LABELS: { key: keyof Dossier; label: string }[] = [
  { key: 'projectType', label: 'Type de demande' },
  { key: 'aiSummary', label: 'Description' },
  { key: 'budget', label: 'Budget' },
  { key: 'desiredTimeline', label: 'Délai' },
]

function DossierSummary({ dossier, score }: { dossier: Dossier; score: number }) {
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
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, score))}%`, background: '#22c55e', transition: 'width 0.4s ease' }} />
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
      <div className="mx-auto flex min-h-dvh w-full max-w-[1240px] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <header
          className="mb-5 flex flex-col gap-4 rounded-[24px] border px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'rgba(7,7,9,0.72)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
          }}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-3">
              <KadriaLogo size="sm" theme="dark" noLink />
              <span
                style={{
                  border: '1px solid rgba(34,197,94,0.18)',
                  background: 'rgba(34,197,94,0.08)',
                  color: '#dcfce7',
                  borderRadius: '999px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Demande guidée · 3 min
              </span>
            </div>
            <div>
              <p style={{ margin: 0, color: '#f4f4f5', fontSize: '15px', fontWeight: 600 }}>
                Assistant projet
              </p>
              <p style={{ margin: '4px 0 0', color: '#a1a1aa', fontSize: '13px', lineHeight: 1.6 }}>
                {artisanName
                  ? `Demande transmise à ${artisanName}.`
                  : 'Un parcours simple pour transmettre une demande claire, complète et exploitable à l artisan.'}
              </p>
            </div>
          </div>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            style={{ width: '100%', maxWidth: '440px' }}
          >
            {[
              'Parcours guidé',
              'Sans compte',
              'Transmission directe',
            ].map((item) => (
              <div
                key={item}
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  color: '#e4e4e7',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <aside
            className="rounded-[28px] border p-5 lg:sticky lg:top-6"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              background: 'linear-gradient(180deg, rgba(17,24,20,0.78) 0%, rgba(9,9,11,0.74) 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '18px',
                background: 'rgba(34,197,94,0.10)',
                border: '1px solid rgba(34,197,94,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#86efac',
                fontSize: '22px',
                marginBottom: '16px',
              }}
            >
              ✦
            </div>
            <h1 style={{ margin: '0 0 10px', color: 'white', fontSize: '24px', lineHeight: 1.15, fontWeight: 700 }}>
              Décrivez votre projet en quelques étapes
            </h1>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px', lineHeight: 1.7 }}>
              Kadria vous guide pour qualifier votre demande, ajouter les bons détails et transmettre un dossier professionnel à l artisan.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {[
                'Le bon type de demande dès le départ',
                'Des questions courtes et utiles',
                'Un dossier lisible pour l artisan',
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    color: '#e4e4e7',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <div
              className="mt-5 hidden lg:block"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '16px',
              }}
            >
              <p style={{ margin: '0 0 10px', color: '#f4f4f5', fontSize: '13px', fontWeight: 600 }}>
                Résumé de votre demande
              </p>
              <DossierSummary dossier={dossier} score={score} />
            </div>
          </aside>

          <section className="min-h-[640px] overflow-hidden rounded-[28px] lg:min-h-[760px]">
            <ChatWidgetInline
              artisanId={artisanId}
              inline={true}
              fullPage={true}
              projectExperience={true}
              onDossierChange={(d, s) => { setDossier(d); setScore(s) }}
              onArtisanNameChange={setArtisanName}
            />
          </section>
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
            <DossierSummary dossier={dossier} score={score} />
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
