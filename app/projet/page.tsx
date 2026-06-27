'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline'
import { KadriaLogo } from '@/src/components/KadriaLogo'

function ProjetContent() {
  const searchParams = useSearchParams()
  const artisanId = searchParams.get('artisan_id') ?? ''

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
                Assistant de qualification projet
              </p>
              <p style={{ margin: '4px 0 0', color: '#a1a1aa', fontSize: '13px', lineHeight: 1.6 }}>
                Un parcours simple pour transmettre une demande claire, complète et exploitable à l artisan.
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
          </aside>

          <section className="min-h-[640px] overflow-hidden rounded-[28px] lg:min-h-[760px]">
            <ChatWidgetInline
              artisanId={artisanId}
              inline={true}
              fullPage={true}
              projectExperience={true}
            />
          </section>
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
