'use client';

import { useState, type CSSProperties, type ReactElement } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExpertProjectView } from '@/src/lib/expert-project';
import type { QualificationFieldType } from '@/src/lib/qualification-fields';

interface ExpertModeCardProps {
  view: ExpertProjectView;
}

const QUALIFICATION_FIELD_TYPE_LABELS: Record<QualificationFieldType, string> = {
  text: 'texte',
  number: 'nombre',
  boolean: 'oui/non',
  date: 'date',
  select: 'choix',
  multiselect: 'choix multiples',
  photo: 'photo',
  phone: 'téléphone',
  email: 'email',
  address: 'adresse',
  currency: 'montant',
};

const card: CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '20px',
};

const sectionTitle: CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-3)',
  fontWeight: 700,
  margin: '0 0 10px',
};

const badge = (background: string, color: string): CSSProperties => ({
  background,
  color,
  borderRadius: '999px',
  padding: '3px 10px',
  fontSize: '12px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  display: 'inline-block',
});

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 700 }}>{clamped}%</span>
      </div>
      <div style={{ height: '8px', borderRadius: '6px', background: 'var(--border)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: 'var(--accent)',
            transition: 'width 0.2s',
          }}
        />
      </div>
    </div>
  );
}

function RecognitionSection({ view }: { view: ExpertProjectView }) {
  return (
    <div style={card}>
      <p style={sectionTitle}>Reconnaissance</p>
      {view.recognition.available ? (
        <>
          <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>
            Projet reconnu : {view.recognition.label}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={badge('var(--badge-qualified-bg)', 'var(--badge-qualified-text)')}>
              Confiance : {view.confidence.percent}%
            </span>
            <span style={badge('var(--badge-new-bg)', 'var(--badge-new-text)')}>
              Source : {view.recognition.source}
            </span>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-3)' }}>non disponible</p>
      )}
    </div>
  );
}

function QualificationSection({ view }: { view: ExpertProjectView }) {
  return (
    <div style={card}>
      <p style={sectionTitle}>Qualification</p>
      {view.qualification.available ? (
        <>
          <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600 }}>
            {view.qualification.remaining === 0
              ? 'Toutes les questions ont une réponse'
              : `${view.qualification.remaining} question${view.qualification.remaining > 1 ? 's' : ''} restante${view.qualification.remaining > 1 ? 's' : ''} sur ${view.qualification.total}`}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {view.qualification.questions.map((q, i) => (
              <li
                key={i}
                style={{
                  fontSize: '13px',
                  color: q.answered ? 'var(--text-1)' : 'var(--text-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ color: q.answered ? 'var(--accent)' : 'var(--text-3)' }}>
                  {q.answered ? '✓' : '○'}
                </span>
                {q.label}
                {q.type && (
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    ({QUALIFICATION_FIELD_TYPE_LABELS[q.type]})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-3)' }}>non disponible</p>
      )}
    </div>
  );
}

function PhotosSection({ view }: { view: ExpertProjectView }) {
  return (
    <div style={card}>
      <p style={sectionTitle}>Photos</p>
      {view.photos.available ? (
        <>
          <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600 }}>
            Photos nécessaires : {view.photos.required === null ? 'non précisé' : view.photos.required ? 'Oui' : 'Non'}
          </p>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-2)' }}>
            {view.photos.currentCount} photo{view.photos.currentCount !== 1 ? 's' : ''} déjà fournie
            {view.photos.currentCount !== 1 ? 's' : ''}
          </p>
          {view.photos.requestedList && view.photos.requestedList.length > 0 ? (
            <>
              <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                Photos attendues
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {view.photos.requestedList.map((photo) => (
                  <li
                    key={photo.id}
                    title={photo.description || undefined}
                    style={{
                      fontSize: '13px',
                      color: photo.required ? 'var(--text-1)' : 'var(--text-3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ color: photo.required ? 'var(--accent)' : 'var(--text-3)' }}>
                      {photo.required ? '✓' : '○'}
                    </span>
                    {photo.title}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-3)' }}>
              Aucune photo spécifique configurée.
            </p>
          )}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-3)' }}>
          Aucune photo spécifique configurée.
        </p>
      )}
    </div>
  );
}

function QuoteSection({ view }: { view: ExpertProjectView }) {
  return (
    <div style={card}>
      <p style={sectionTitle}>Devis</p>
      <ProgressBar percent={view.quote.percent} label={`Devis prêt à ${view.quote.percent}%`} />
      <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {view.quote.categories.map((c) => (
          <li
            key={c.key}
            style={{
              fontSize: '13px',
              color: c.done ? 'var(--text-1)' : 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: c.done ? 'var(--accent)' : 'var(--text-3)' }}>{c.done ? '✓' : '○'}</span>
            {c.label} ({c.weight}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanningSection({ view }: { view: ExpertProjectView }) {
  return (
    <div style={card}>
      <p style={sectionTitle}>Planification</p>
      {view.planning.available ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          <p style={{ margin: 0 }}>
            Durée estimée : <strong>{view.planning.estimatedDuration ?? 'non disponible'}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Déplacement : <strong>{view.planning.travelRequired ? 'Oui' : 'Non'}</strong>
          </p>
          <p style={{ margin: 0 }}>
            RDV conseillé : <strong>{view.planning.appointmentRecommended ? 'Oui' : 'Non'}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Urgence : <strong>{view.planning.urgent ? 'Oui' : 'Non'}</strong>
          </p>
          {view.planning.desiredTimeline && (
            <p style={{ margin: 0 }}>
              Délai souhaité : <strong>{view.planning.desiredTimeline}</strong>
            </p>
          )}
          {view.planning.callbackDate && (
            <p style={{ margin: 0 }}>
              Date de rappel : <strong>{view.planning.callbackDate}</strong>
            </p>
          )}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-3)' }}>non disponible</p>
      )}
    </div>
  );
}

function RisksSection({ view }: { view: ExpertProjectView }) {
  return (
    <div style={card}>
      <p style={sectionTitle}>Blocages détectés</p>
      {view.risks.blockingReasons.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {view.risks.blockingReasons.map((reason, i) => (
            <li
              key={i}
              style={{ fontSize: '13px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>⚠</span>
              {reason}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-2)' }}>Aucun blocage détecté</p>
      )}
    </div>
  );
}

function SummarySection({ view }: { view: ExpertProjectView }) {
  return (
    <div
      style={{
        ...card,
        background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg))',
        border: '1px solid var(--accent)',
      }}
    >
      <p style={sectionTitle}>Synthèse Mode Expert</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {view.summary.bars.map((bar) => (
          <ProgressBar key={bar.label} percent={bar.percent} label={bar.label} />
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
        <p style={sectionTitle}>Prochaine meilleure action</p>
        <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700 }}>{view.summary.nextBestAction.title}</p>
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-2)' }}>
          {view.summary.nextBestAction.subtitle}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>
          {view.summary.nextBestAction.description}
        </p>
      </div>
    </div>
  );
}

const SECTIONS: Array<{ key: string; title: string; Component: (props: { view: ExpertProjectView }) => ReactElement }> = [
  { key: 'recognition', title: 'Reconnaissance', Component: RecognitionSection },
  { key: 'qualification', title: 'Qualification', Component: QualificationSection },
  { key: 'photos', title: 'Photos', Component: PhotosSection },
  { key: 'quote', title: 'Devis', Component: QuoteSection },
  { key: 'planning', title: 'Planification', Component: PlanningSection },
  { key: 'risks', title: 'Risques', Component: RisksSection },
  { key: 'summary', title: 'Synthèse', Component: SummarySection },
];

export default function ExpertModeCardDesktop({ view }: ExpertModeCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
        <span style={badge('var(--badge-progress-bg)', 'var(--badge-progress-text)')}>Mode Expert</span>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Vue décisionnelle du projet</h2>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {SECTIONS.map(({ key, Component }) => (
          <Component key={key} view={view} />
        ))}
      </div>
    </div>
  );
}

export function ExpertModeAccordionMobile({ view }: ExpertModeCardProps) {
  const [openKey, setOpenKey] = useState<string | null>('summary');

  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '0 4px' }}>
        <span style={badge('var(--badge-progress-bg)', 'var(--badge-progress-text)')}>Mode Expert</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {SECTIONS.map(({ key, title, Component }) => {
          const isOpen = openKey === key;
          return (
            <div
              key={key}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'var(--bg-elevated)',
              }}
            >
              <button
                onClick={() => setOpenKey(isOpen ? null : key)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-1)',
                }}
              >
                {title}
                <ChevronDown
                  size={16}
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                    color: 'var(--text-3)',
                  }}
                />
              </button>
              {isOpen && (
                <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '0 14px 14px' }}>
                  <Component view={view} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
