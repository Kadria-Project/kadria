'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  FileText as FileTextIcon,
  Plus,
} from 'lucide-react';
import { DemoToast } from '@/src/components/DemoToast';
import { DOSSIER_DEMO } from '@/lib/demo-data';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Nouveau':      { bg: 'rgba(63,63,70,0.4)',   text: '#a1a1aa', border: '#3f3f46' },
  'À rappeler':   { bg: 'rgba(217,119,6,0.15)', text: '#d97706', border: 'rgba(217,119,6,0.3)' },
  'Qualifié':     { bg: 'rgba(22,163,74,0.15)', text: '#16a34a', border: 'rgba(22,163,74,0.3)' },
  'Devis envoyé': { bg: 'rgba(37,99,235,0.15)', text: '#2563eb', border: 'rgba(37,99,235,0.3)' },
  'Gagné':        { bg: 'rgba(21,128,61,0.15)', text: '#15803d', border: 'rgba(21,128,61,0.3)' },
  'Perdu':        { bg: 'rgba(220,38,38,0.15)', text: '#dc2626', border: 'rgba(220,38,38,0.3)' },
};

const EVENT_TYPES = [
  { value: 'Relance', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: '#d97706' },
  { value: 'Rappel', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: '#3b82f6' },
  { value: 'RDV', color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: '#22c55e' },
  { value: 'Intervention', color: '#c084fc', bg: 'rgba(192,132,252,0.15)', border: '#a855f7' },
];

function TimelineIcon({ type }: { type?: string }) {
  if (type === 'creation') {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
        <Plus className="w-3 h-3 text-zinc-950" />
      </span>
    );
  }

  if (type === 'statut') {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
        <ArrowRight className="w-3 h-3 text-white" />
      </span>
    );
  }

  if (type === 'note') {
    return (
      <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
        <FileTextIcon className="w-3 h-3 text-blue-400" />
      </span>
    );
  }

  return (
    <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
      <Clock className="w-3 h-3 text-amber-500" />
    </span>
  );
}

export default function DemoProjectDetailPage() {
  const router = useRouter();
  const project = DOSSIER_DEMO;
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [demoToast, setDemoToast] = useState(false);

  const showToast = () => setDemoToast(true);

  const currentStyle = STATUS_COLORS[project.statut] || STATUS_COLORS['Nouveau'];
  const allEvents = project.historique;
  const events = showAllHistory ? allEvents : allEvents.slice(0, 3);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/demo-dashboard')}
            className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <button
            onClick={showToast}
            style={{
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#a1a1aa',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📄 Exporter PDF
          </button>
        </div>

        {/* Profil */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '24px', marginBottom: '16px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div>
              <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>
                {project.nom}
              </h1>
              <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>
                {project.metier} · {project.ville}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
              <div>
                <p style={{ color: '#71717a', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px', textAlign: 'right' }}>
                  Statut dossier
                </p>
                <span style={{ background: currentStyle.bg, color: currentStyle.text, border: `1px solid ${currentStyle.border}`, borderRadius: '20px', padding: '5px 14px', fontSize: '13px', fontWeight: 600 }}>
                  {project.statut}
                </span>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #3f3f46', margin: '16px 0' }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            <a href={`tel:${project.telephone}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', textDecoration: 'none', fontSize: '13px' }}>
              <span style={{ color: '#22c55e', fontSize: '14px' }}>📞</span>
              {project.telephone}
            </a>

            <a href={`mailto:${project.email}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', textDecoration: 'none', fontSize: '13px' }}>
              <span style={{ color: '#22c55e', fontSize: '14px' }}>✉️</span>
              {project.email}
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontSize: '13px' }}>
              <span style={{ color: '#22c55e', fontSize: '14px' }}>📍</span>
              {project.adresse}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#71717a', fontSize: '12px', marginLeft: 'auto' }}>
              <span>📅</span>
              Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
            </div>

            <button
              onClick={showToast}
              title="Disponible après inscription"
              style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#71717a', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ✏️ Modifier
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.22)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ color: '#22c55e', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Moment idéal de relance
            </p>
            <p style={{ color: 'white', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>
              Aujourd’hui entre 12 h et 14 h
            </p>
            <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>Ou entre 17 h et 20 h</p>
          </div>
          <div style={{ color: '#a1a1aa', fontSize: '12px', minWidth: '220px' }}>
            <p style={{ margin: '0 0 4px' }}>Dernier échange : <span style={{ color: '#e4e4e7' }}>Hier</span></p>
            <p style={{ margin: 0 }}>Sans interaction : <span style={{ color: '#e4e4e7' }}>1 jour</span></p>
          </div>
        </div>

        {/* Suivi commercial */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ color: 'white', fontSize: '15px', fontWeight: 600, margin: 0 }}>Suivi commercial</h2>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#52525b', background: '#27272a', borderRadius: '6px', padding: '3px 8px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                #{project.id.slice(-8).toUpperCase()}
              </span>
              <span style={{ fontSize: '11px', color: '#52525b', background: '#27272a', borderRadius: '6px', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                via {project.source}
              </span>
            </div>
          </div>

          {/* Pipeline */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #27272a' }}>
            <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              Faire avancer le dossier
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['À rappeler', 'Qualifié', 'Devis envoyé', 'Gagné', 'Perdu'].map((s) => (
                <button
                  key={s}
                  disabled
                  title="Disponible après inscription"
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: project.statut === s ? 700 : 500,
                    cursor: 'not-allowed',
                    opacity: 0.5,
                    background: project.statut === s ? STATUS_COLORS[s].bg : '#09090b',
                    color: project.statut === s ? STATUS_COLORS[s].text : '#a1a1aa',
                    border: `1px solid ${STATUS_COLORS[s].border}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Montant devis */}
            <div style={{ borderTop: '1px solid #27272a', marginTop: '12px', paddingTop: '14px' }}>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Montant du devis
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    disabled
                    readOnly
                    placeholder={`Budget estimé : ${project.budget}`}
                    style={{
                      width: '100%',
                      background: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      padding: '8px 40px 8px 12px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      opacity: 0.6,
                    }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: '14px' }}>€</span>
                </div>
                <button
                  disabled
                  title="Disponible après inscription"
                  style={{ background: '#27272a', border: 'none', color: '#71717a', fontWeight: 600, borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'not-allowed', whiteSpace: 'nowrap', flexShrink: 0, opacity: 0.6 }}
                >
                  Enregistrer
                </button>
              </div>
              <p style={{ color: '#71717a', fontSize: '12px', margin: '6px 0 0' }}>
                Budget estimé utilisé par défaut : {project.budget}
              </p>
            </div>

            {/* Devis */}
            <div style={{ borderTop: '1px solid #27272a', marginTop: '12px', paddingTop: '14px' }}>
              <button
                onClick={showToast}
                style={{
                  width: '100%',
                  background: '#18181b',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#22c55e',
                  cursor: 'pointer',
                }}
              >
                📄 Générer un devis
              </button>
              <button
                onClick={showToast}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#09090b',
                  cursor: 'pointer',
                }}
              >
                Relancer le devis
              </button>
            </div>

            {/* Clôture */}
            <div style={{ borderTop: '1px solid #27272a', marginTop: '12px', paddingTop: '12px' }}>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Clôture du dossier
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled
                  title="Disponible après inscription"
                  style={{ flex: 1, background: 'rgba(20,83,45,0.2)', border: '1px solid #16a34a', color: '#86efac', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 600, cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  🏆 Chantier gagné
                </button>
                <button
                  disabled
                  title="Disponible après inscription"
                  style={{ flex: 1, background: 'rgba(69,10,10,0.2)', border: '1px solid #dc2626', color: '#f87171', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 600, cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  🗄️ Archiver (perdu)
                </button>
              </div>
            </div>
          </div>

          {/* Calendrier */}
          <div style={{ padding: '14px 20px' }}>
            <div style={{ borderTop: '1px solid #27272a', marginTop: '12px', paddingTop: '14px' }}>
              <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Planifier dans le calendrier
              </p>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    disabled
                    title="Disponible après inscription"
                    style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', cursor: 'not-allowed', opacity: 0.5 }}
                  >
                    {t.value}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="datetime-local"
                  disabled
                  style={{ flex: 1, background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', padding: '7px 10px', color: 'white', fontSize: '13px', outline: 'none', opacity: 0.5 }}
                />
                <button
                  disabled
                  title="Disponible après inscription"
                  style={{ background: '#27272a', border: 'none', color: '#71717a', fontWeight: 600, borderRadius: '8px', padding: '7px 16px', fontSize: '13px', cursor: 'not-allowed', whiteSpace: 'nowrap', flexShrink: 0, opacity: 0.5 }}
                >
                  + Calendrier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Analyse Kadria */}
        <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>✦</span>
              <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '14px', letterSpacing: '0.02em' }}>
                Analyse Kadria
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px', padding: '4px 12px' }}>
              <span style={{ fontSize: '12px' }}>🔥</span>
              <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 700 }}>
                {project.analyse}
              </span>
              <span style={{ color: '#22c55e', fontSize: '11px', opacity: 0.8 }}>
                — Score {project.score}%
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#27272a', borderBottom: '1px solid #27272a' }}>
            {[
              { label: 'Budget cohérent', detail: project.budget, ok: true },
              { label: 'Délai réaliste', detail: project.delai, ok: true },
              { label: 'Contact vérifié', detail: 'Téléphone + email', ok: true },
              { label: 'Photos jointes', detail: 'Aucune photo', ok: false },
            ].map((ind, i) => (
              <div key={i} style={{ background: '#09090b', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: ind.ok ? '#22c55e' : '#f87171', fontSize: '14px' }}>
                    {ind.ok ? '✓' : '✗'}
                  </span>
                  <span style={{ color: ind.ok ? '#e4e4e7' : '#a1a1aa', fontSize: '12px', fontWeight: 500 }}>
                    {ind.label}
                  </span>
                </div>
                <span style={{ color: '#71717a', fontSize: '11px', paddingLeft: '20px' }}>
                  {ind.detail}
                </span>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a' }}>
            <p style={{ color: '#22c55e', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              Résumé du projet
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🏗️', label: 'Le projet', value: `${project.projet} · ${project.surface}` },
                { icon: '💶', label: "L'enjeu", value: `${project.budget} — ${project.delai}` },
                { icon: '🎯', label: 'Priorité', value: project.analyse },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ color: '#71717a', fontSize: '12px', minWidth: '80px', flexShrink: 0 }}>
                    {item.label} :
                  </span>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a' }}>
            <p style={{ color: '#22c55e', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Synthèse IA
            </p>
            <p style={{ color: '#d4d4d8', fontSize: '13px', lineHeight: '1.7', margin: 0, fontStyle: 'italic' }}>
              {project.synthese}
            </p>
          </div>

          <div style={{ padding: '14px 20px', background: 'rgba(34, 197, 94, 0.05)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
            <div>
              <p style={{ color: '#22c55e', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                Recommandation Kadria
              </p>
              <p style={{ color: '#d4d4d8', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                {project.recommandation}
              </p>
            </div>
          </div>
        </div>

        {/* Notes internes */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span>
            <span style={{ color: 'white', fontWeight: 500 }}>Notes internes</span>
          </div>
          <p style={{ color: '#d4d4d8', fontSize: '13px', margin: '10px 0 0', fontStyle: 'italic', lineHeight: 1.6 }}>
            Client réactif, disponible en semaine après 17h. Visite technique à proposer rapidement.
          </p>
        </div>

        {/* Historique */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Historique du dossier</h2>

          <div className="relative">
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-zinc-800" />

            {events.map((activity, i) => (
              <div key={i} className="relative pl-10 pb-5 last:pb-0">
                <TimelineIcon type={activity.type} />

                <p className="font-medium text-white text-sm">{activity.texte}</p>

                <p className="text-xs text-zinc-400 mt-0.5">{activity.date}</p>
              </div>
            ))}
          </div>

          {allEvents.length > 3 && (
            <button
              onClick={() => setShowAllHistory((v) => !v)}
              className="text-sm text-green-500 hover:underline"
            >
              {showAllHistory ? 'Réduire' : "Voir tout l'historique"}
            </button>
          )}
        </section>
      </main>

      <DemoToast show={demoToast} onClose={() => setDemoToast(false)} />
    </div>
  );
}
