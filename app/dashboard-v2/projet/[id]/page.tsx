'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, updateProject, getProjectActivity } from '@/src/lib/api';
import AuthGuard from '@/src/components/AuthGuard';
import { Button } from '@/src/components/ui/button';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  FileText,
  CircleDot,
} from 'lucide-react';

const PIPELINE_STATUSES = ['À rappeler', 'Qualifié', 'Devis envoyé', 'Gagné', 'Perdu'];

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'À rappeler': { bg: '#78350f', text: '#fbbf24', border: '#d97706' },
  'Qualifié':   { bg: '#14532d', text: '#4ade80', border: '#16a34a' },
  'Devis envoyé': { bg: '#1e3a5f', text: '#60a5fa', border: '#2563eb' },
  'Gagné':      { bg: '#14532d', text: '#86efac', border: '#22c55e' },
  'Perdu':      { bg: '#450a0a', text: '#f87171', border: '#dc2626' },
};

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  'Nouveau':      { bg: '#27272a', text: '#e4e4e7', border: '#3f3f46' },
  'À rappeler':   { bg: '#78350f', text: '#fbbf24', border: '#d97706' },
  'Qualifié':     { bg: '#14532d', text: '#4ade80', border: '#16a34a' },
  'Devis envoyé': { bg: '#1e3a5f', text: '#60a5fa', border: '#2563eb' },
  'Gagné':        { bg: '#14532d', text: '#86efac', border: '#22c55e' },
  'Perdu':        { bg: '#450a0a', text: '#f87171', border: '#dc2626' },
};

export default function ProjectDetailPage() {
  return (
    <AuthGuard>
      <ProjectDetail />
    </AuthGuard>
  );
}

function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [showCallback, setShowCallback] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [showRdvModal, setShowRdvModal] = useState(false);
  const [rdvData, setRdvData] = useState({
    title: '',
    date: '',
    time: '',
    type: 'RDV',
    notes: '',
  });

  async function loadActivities() {
    const activityData = await getProjectActivity(id);

    if (activityData.success) {
      setActivities(activityData.activities);
    }
  }

  useEffect(() => {
    async function loadProject() {
      try {
        const data = await getProject(id);

        setProject(data.project);
        setNotes(data.project?.internalNotes || '');
        setCallbackDate(data.project?.callbackDate || '');
        setShowCallback(!!data.project?.callbackDate);

        await loadActivities();
      } catch (error) {
        console.error('PROJECT_DETAIL_ERROR', error);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadProject();
  }, [id]);

  async function updateStatus(status: string) {
    try {
      setUpdating(true);

      const data = await updateProject(id, { status, contacted: true });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('UPDATE_STATUS_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function saveNotes() {
    try {
      setUpdating(true);

      const data = await updateProject(id, { internalNotes: notes });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('SAVE_NOTES_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  async function saveCallback() {
    try {
      setUpdating(true);

      const data = await updateProject(id, { callbackDate: callbackDate || null });

      if (data.success) {
        setProject(data.project);
        await loadActivities();
      }
    } catch (error) {
      console.error('SAVE_CALLBACK_DATE_ERROR', error);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Chargement du dossier...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Dossier introuvable.</p>
      </div>
    );
  }

  const currentStyle = statusStyles[project.status] || statusStyles['Nouveau'];
  const verdict = getVerdict(project);
  const recommendation = getRecommendation(project);
  const indicators = getIndicators(project);
  const summary = getStructuredSummary(project);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard-v2')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
        }}>
          {/* Ligne 1 : Nom + Statut */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '6px',
          }}>
            <div>
              <h1 style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: 700,
                margin: '0 0 4px',
              }}>
                {project.clientFirstName} {project.clientName}
              </h1>
              <p style={{
                color: '#a1a1aa',
                fontSize: '14px',
                margin: 0,
              }}>
                {project.trade} · {project.city}
              </p>
            </div>
            {/* Statut */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px',
              flexShrink: 0,
            }}>
              <div>
                <p style={{
                  color: '#71717a',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: '0 0 4px',
                  textAlign: 'right',
                }}>
                  Statut dossier
                </p>
                <span style={{
                  background: currentStyle.bg,
                  color: currentStyle.text,
                  border: `1px solid ${currentStyle.border}`,
                  borderRadius: '20px',
                  padding: '5px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  {project.status || 'Nouveau'}
                </span>
              </div>
              {/* ID + source sous le statut */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{
                  fontSize: '11px', color: '#52525b',
                  background: '#27272a', borderRadius: '6px',
                  padding: '3px 8px', whiteSpace: 'nowrap',
                }}>
                  #{project.id?.slice(-8).toUpperCase()}
                </span>
                {project.source && (
                  <span style={{
                    fontSize: '11px', color: '#52525b',
                    background: '#27272a', borderRadius: '6px',
                    padding: '3px 8px', whiteSpace: 'nowrap',
                  }}>
                    via {project.source}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <hr style={{
            border: 'none',
            borderTop: '1px solid #3f3f46',
            margin: '16px 0',
          }} />

          {/* Ligne 2 : Infos de contact */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            alignItems: 'center',
          }}>
            {project.clientPhone && (
              <a href={`tel:${project.clientPhone}`} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'white', textDecoration: 'none', fontSize: '13px',
              }}>
                <span style={{ color: '#22c55e', fontSize: '14px' }}>📞</span>
                {project.clientPhone}
              </a>
            )}
            {project.clientEmail && (
              <a href={`mailto:${project.clientEmail}`} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'white', textDecoration: 'none', fontSize: '13px',
              }}>
                <span style={{ color: '#22c55e', fontSize: '14px' }}>✉️</span>
                {project.clientEmail}
              </a>
            )}
            {project.siteAddress && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'white', fontSize: '13px',
              }}>
                <span style={{ color: '#22c55e', fontSize: '14px' }}>📍</span>
                {(() => {
                  const addr = project.siteAddress || '';
                  const city = project.city || '';
                  if (city && addr.toLowerCase().includes(city.toLowerCase())) {
                    return addr;
                  }
                  return city ? `${addr}, ${city}` : addr;
                })()}
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: '#71717a', fontSize: '12px',
              marginLeft: 'auto',
            }}>
              <span>📅</span>
              Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions commerciales</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <a
              href={`tel:${project.clientPhone}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Phone className="w-4 h-4 mr-2" />
              Appeler
            </a>

            <a
              href={`mailto:${project.clientEmail}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </a>

            <Button variant="outline" onClick={() => setShowRdvModal(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Rendez-vous
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => noteRef.current?.focus(), 400);
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Note interne
            </Button>
          </div>

          <div style={{
            borderTop: '1px solid #27272a',
            marginTop: '12px',
            paddingTop: '12px',
          }}>
            {!showCallback && !callbackDate ? (
              <button
                onClick={() => setShowCallback(true)}
                style={{
                  background: 'transparent',
                  border: '1px dashed #3f3f46',
                  color: '#71717a',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                + Programmer une relance
              </button>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#a1a1aa',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  📅 Relance :
                </span>
                <input
                  type="datetime-local"
                  value={callbackDate ? callbackDate.slice(0, 16) : ''}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  disabled={updating}
                  onClick={saveCallback}
                  style={{
                    background: '#22c55e',
                    border: 'none',
                    color: 'black',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => { setShowCallback(false); setCallbackDate(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    fontSize: '16px',
                    flexShrink: 0,
                    padding: '0 4px',
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pipeline commercial</h2>

          <div className="flex flex-wrap gap-2">
            {PIPELINE_STATUSES.map((status) => {
              const isActive = project.status === status;
              const colors = statusColors[status];

              return (
                <Button
                  key={status}
                  disabled={updating}
                  onClick={() => updateStatus(status)}
                  variant="outline"
                  style={
                    isActive
                      ? {
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          opacity: 1,
                          fontWeight: 700,
                        }
                      : {
                          background: '#18181b',
                          color: '#a1a1aa',
                          border: `1px solid ${colors.border}`,
                          opacity: 0.7,
                        }
                  }
                >
                  {status}
                </Button>
              );
            })}
          </div>
        </section>

        <div style={{
          background: '#09090b',
          border: '1px solid #27272a',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {/* Header avec badge verdict */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>✦</span>
              <span style={{
                color: '#22c55e',
                fontWeight: 700,
                fontSize: '14px',
                letterSpacing: '0.02em'
              }}>
                Analyse Kadria
              </span>
            </div>
            {/* Badge verdict */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: verdict.bg,
              border: `1px solid ${verdict.border}`,
              borderRadius: '20px',
              padding: '4px 12px',
            }}>
              <span style={{ fontSize: '12px' }}>{verdict.icon}</span>
              <span style={{
                color: verdict.color,
                fontSize: '12px',
                fontWeight: 700
              }}>
                {verdict.label}
              </span>
              <span style={{
                color: verdict.color,
                fontSize: '11px',
                opacity: 0.8,
              }}>
                — {verdict.description}
              </span>
            </div>
          </div>

          {/* Indicateurs qualité */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            background: '#27272a',
            borderBottom: '1px solid #27272a',
          }}>
            {indicators.map((ind, i) => {
              if (i === 3 && project.photos && project.photos.length > 0) {
                const photos = project.photos;

                return (
                  <div key={i} style={{
                    background: '#09090b',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#22c55e', fontSize: '14px' }}>✓</span>
                      <span style={{ color: '#e4e4e7', fontSize: '12px', fontWeight: 500 }}>
                        Photos jointes
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', paddingLeft: '20px', flexWrap: 'wrap' }}>
                      {photos.slice(0, 4).map((photo: any, idx: number) => {
                        const url = photo.url || (typeof photo === 'string' ? photo : '#');
                        const thumbUrl = photo.thumbnailUrl || photo.url || (typeof photo === 'string' ? photo : '');

                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #27272a',
                              display: 'block',
                            }}
                          >
                            <img
                              src={thumbUrl}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </a>
                        );
                      })}
                      {photos.length > 4 && (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '6px',
                          border: '1px solid #27272a',
                          background: '#18181b',
                          color: '#a1a1aa',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          +{photos.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} style={{
                  background: '#09090b',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      color: ind.ok ? '#22c55e' : '#f87171',
                      fontSize: '14px'
                    }}>
                      {ind.ok ? '✓' : '✗'}
                    </span>
                    <span style={{
                      color: ind.ok ? '#e4e4e7' : '#a1a1aa',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}>
                      {ind.label}
                    </span>
                  </div>
                  <span style={{
                    color: '#71717a',
                    fontSize: '11px',
                    paddingLeft: '20px',
                  }}>
                    {ind.detail}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Résumé structuré */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a' }}>
            <p style={{
              color: '#22c55e',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}>
              Résumé du projet
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🏗️', label: 'Le projet', value: summary.projet },
                { icon: '💶', label: 'L\'enjeu', value: summary.enjeu },
                { icon: '🎯', label: 'Priorité', value: summary.priorite },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{
                    color: '#71717a',
                    fontSize: '12px',
                    minWidth: '80px',
                    flexShrink: 0,
                  }}>
                    {item.label} :
                  </span>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Synthèse IA longue */}
          {project.aiSummary && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a' }}>
              <p style={{
                color: '#22c55e',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                margin: '0 0 8px',
              }}>
                Synthèse IA
              </p>
              <p style={{
                color: '#d4d4d8',
                fontSize: '13px',
                lineHeight: '1.7',
                margin: 0,
                fontStyle: 'italic',
              }}>
                {project.aiSummary}
              </p>
            </div>
          )}

          {/* Recommandation IA */}
          <div style={{
            padding: '14px 20px',
            background: 'rgba(34, 197, 94, 0.05)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
            <div>
              <p style={{
                color: '#22c55e',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: '0 0 4px',
              }}>
                Recommandation Kadria
              </p>
              <p style={{
                color: '#d4d4d8',
                fontSize: '13px',
                lineHeight: '1.6',
                margin: 0,
              }}>
                {recommendation}
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Notes internes</h2>

          <textarea
            ref={noteRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[180px] rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ajouter une note interne pour le suivi commercial..."
          />

          <Button disabled={updating} onClick={saveNotes}>
            Enregistrer la note
          </Button>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Historique du dossier</h2>

          {activities.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Aucun historique disponible.
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <CircleDot className="w-4 h-4 mt-1 text-green-500" />

                  <div>
                    <p className="font-medium text-white">{activity.description}</p>

                    <p className="text-xs text-zinc-400">
                      {activity.createdAt
                        ? new Date(activity.createdAt).toLocaleString('fr-FR')
                        : 'Date inconnue'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {showRdvModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">📅 Nouveau rendez-vous</h2>

              <button
                onClick={() => setShowRdvModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Titre</label>
                <input
                  type="text"
                  value={rdvData.title}
                  onChange={(e) => setRdvData({ ...rdvData, title: e.target.value })}
                  placeholder="Visite technique, Devis..."
                  className="w-full mt-1 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Type</label>
                <select
                  value={rdvData.type}
                  onChange={(e) => setRdvData({ ...rdvData, type: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="RDV">RDV</option>
                  <option value="Relance">Relance</option>
                  <option value="Rappel">Rappel</option>
                  <option value="Intervention">Intervention</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={rdvData.date}
                    onChange={(e) => setRdvData({ ...rdvData, date: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wide">Heure</label>
                  <input
                    type="time"
                    value={rdvData.time}
                    onChange={(e) => setRdvData({ ...rdvData, time: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Notes</label>
                <textarea
                  value={rdvData.notes}
                  onChange={(e) => setRdvData({ ...rdvData, notes: e.target.value })}
                  rows={3}
                  className="w-full mt-1 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <button
              onClick={() => {
                console.log('[RDV]', rdvData);
                setShowRdvModal(false);
                alert('RDV enregistré — le calendrier arrive bientôt !');
              }}
              className="w-full bg-green-500 text-black font-bold rounded-lg px-4 py-2"
            >
              Enregistrer le RDV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getVerdict(project: any) {
  const score = project.completenessScore || 0;
  const maturity = project.maturity || '';
  const budget = project.budget || '';
  const timeline = project.desiredTimeline || '';

  const isHot = score >= 80 &&
    (maturity.includes('Prêt') || maturity.includes('urgent')) &&
    !budget.includes('sais pas') &&
    (timeline.includes('possible') || timeline.includes('1 mois'));

  const isCold = score < 60 ||
    budget.includes('sais pas') ||
    maturity.includes('renseigne');

  if (isHot) return {
    label: 'Prospect chaud',
    color: '#22c55e',
    bg: '#14532d',
    border: '#16a34a',
    icon: '🔥',
    description: 'Budget défini, délai court, prêt à démarrer'
  };
  if (isCold) return {
    label: 'Prospect froid',
    color: '#f87171',
    bg: '#450a0a',
    border: '#dc2626',
    icon: '❄️',
    description: 'Budget flou ou projet peu défini'
  };
  return {
    label: 'À qualifier',
    color: '#fbbf24',
    bg: '#78350f',
    border: '#d97706',
    icon: '⚡',
    description: 'Quelques informations manquantes'
  };
}

function getRecommendation(project: any) {
  const maturity = project.maturity || '';
  const timeline = project.desiredTimeline || '';
  const budget = project.budget || '';

  if (maturity.includes('Prêt') || maturity.includes('urgent')) {
    return "Ce prospect est prêt à démarrer. Rappel recommandé dans les 24h pour maximiser vos chances de conversion.";
  }
  if (timeline.includes('possible') || timeline.includes('1 mois')) {
    return "Le délai est court. Prenez contact rapidement pour proposer une visite technique avant qu'il ne contacte un concurrent.";
  }
  if (budget.includes('sais pas')) {
    return "Le budget n'est pas défini. Proposez une fourchette lors du premier contact pour qualifier davantage.";
  }
  if (maturity.includes('renseigne') || maturity.includes('compare')) {
    return "Ce prospect est en phase de comparaison. Envoyez un devis rapide et différenciez-vous par la réactivité.";
  }
  return "Prenez contact pour affiner les besoins et proposer une visite technique.";
}

function getIndicators(project: any) {
  return [
    {
      label: 'Budget cohérent',
      ok: !!(project.budget && !project.budget.includes('sais pas')),
      detail: project.budget || 'Non renseigné'
    },
    {
      label: 'Délai réaliste',
      ok: !!(project.desiredTimeline && !project.desiredTimeline.includes('urgence')),
      detail: project.desiredTimeline || 'Non renseigné'
    },
    {
      label: 'Contact vérifié',
      ok: !!(project.clientPhone && project.clientEmail),
      detail: project.clientPhone ? 'Téléphone + email' : 'Incomplet'
    },
    {
      label: 'Photos jointes',
      ok: !!(project.photos && project.photos.length > 0),
      detail: project.photos?.length > 0
        ? `${project.photos.length} photo(s)`
        : 'Aucune photo'
    },
  ];
}

function getStructuredSummary(project: any) {
  return {
    projet: [project.projectType, project.trade]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join(' · ') || 'Non renseigné',
    enjeu: [project.budget, project.desiredTimeline].filter(Boolean).join(' — ') || 'Non renseigné',
    priorite: project.maturity || 'Non renseignée',
  };
}

