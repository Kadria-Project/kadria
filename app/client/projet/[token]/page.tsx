'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface ArtisanBranding {
  brandName: string;
  brandLogoUrl: string | null;
  primaryColor: string;
  trade: string;
}

interface PortalProject {
  clientStatus: string;
  createdAt: string | null;
  clientFirstName: string;
  clientName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  projectType: string;
  trade: string;
  city: string;
  siteAddress: string;
  postalCode: string;
  budget: string;
  desiredTimeline: string;
  summary: string;
  photos: { url: string }[];
  clientMessages: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  message: string | null;
  source: string;
  createdAt: string | null;
  metadata: Record<string, unknown>;
}

function sourceLabel(source: string): string {
  if (source === 'client') return 'Vous';
  if (source === 'artisan') return 'Artisan';
  return 'Kadria';
}

function sourceColor(source: string): string {
  if (source === 'client') return '#16a34a';
  if (source === 'artisan') return '#2563eb';
  return '#6b7280';
}

function formatDateTimeFr(value: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px',
  fontSize: '14px',
  fontFamily: 'inherit',
  color: '#111827',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
};

function formatDate(value: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

// Repli sur l'ancien champ client_messages (texte accumulé, voir
// app/api/client-portal/[token]/route.ts PATCH) pour les projets où la
// nouvelle table ProjectClientEvents ne contient encore aucun message de
// discussion. Toujours du texte côté client, jamais côté artisan — repli
// donc uniquement affiché comme des messages "Vous".
type LegacyMessage = { text: string; date: string | null };

function parseLegacyClientMessages(raw: unknown): LegacyMessage[] {
  try {
    if (typeof raw !== 'string') return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((entry) => {
        const match = entry.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
        if (match) return { text: match[2].trim() || entry.trim(), date: match[1] };
        return { text: entry.trim(), date: null };
      })
      .filter((m) => m.text);
  } catch {
    return [];
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'K';
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [artisan, setArtisan] = useState<ArtisanBranding | null>(null);
  const [project, setProject] = useState<PortalProject | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [availability, setAvailability] = useState('');
  const [urgency, setUrgency] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');

  const [photos, setPhotos] = useState<{ url: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/client-portal/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setInvalid(true);
          return;
        }
        setArtisan(data.artisan || null);
        setProject(data.project || null);
        setTimelineEvents(Array.isArray(data.timelineEvents) ? data.timelineEvents : []);
        // Préremplissage réel des champs connus (mêmes valeurs que la fiche
        // projet artisan), pas seulement en placeholder : le client doit
        // retrouver ses informations déjà éditables, y compris le Nom.
        setFirstName(data.project?.clientFirstName || '');
        setLastName(data.project?.clientLastName || '');
        setEmail(data.project?.clientEmail || '');
        setPhone(data.project?.clientPhone || '');
        setAddress(data.project?.siteAddress || '');
        setBudget(data.project?.budget || '');
        setTimeline(data.project?.desiredTimeline || '');
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
    else {
      setInvalid(true);
      setLoading(false);
    }
  }, [token]);

  // Rafraîchit uniquement la timeline après un envoi (refetch simple, plus
  // sûr qu'une mise à jour optimiste pour ce lot V1).
  const refetchTimeline = async () => {
    try {
      const res = await fetch(`/api/client-portal/${token}`);
      const data = await res.json();
      if (res.ok) {
        setTimelineEvents(Array.isArray(data.timelineEvents) ? data.timelineEvents : []);
      }
    } catch {
      // non bloquant
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setPhotos((prev) => [...prev, ...data.files.map((f: { url: string }) => ({ url: f.url }))]);
      }
    } catch {
      // upload non bloquant
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSubmitError('Adresse email invalide.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/client-portal/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          budget: budget.trim(),
          timeline: timeline.trim(),
          availability: availability.trim(),
          urgency,
          details: details.trim(),
          message: message.trim(),
          photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      setProject(data.project || null);
      setDetails('');
      setMessage('');
      setPhotos([]);
      setDone(true);
      await refetchTimeline();
    } catch {
      setSubmitError("Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const pageWrapperStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(180deg,#f9fafb 0%,#f3f4f6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  };

  if (loading) {
    return (
      <div style={pageWrapperStyle}>
        <p style={{ color: '#6b7280' }}>Chargement...</p>
      </div>
    );
  }

  if (invalid || !project) {
    return (
      <div style={pageWrapperStyle}>
        <div style={{ textAlign: 'center', color: '#374151' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', marginBottom: '12px' }}>
            KADRIA
          </p>
          <p>Lien invalide ou expiré.</p>
        </div>
      </div>
    );
  }

  const primaryColor = /^#[0-9a-f]{3,8}$/i.test(artisan?.primaryColor || '') ? artisan!.primaryColor : '#16a34a';
  const brandName = artisan?.brandName || 'Kadria';

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#111827' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px 64px' }}>

        {/* 1. Header artisan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          {artisan?.brandLogoUrl ? (
            <img src={artisan.brandLogoUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px', background: primaryColor,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '15px',
            }}>
              {initials(brandName)}
            </div>
          )}
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{brandName}</p>
            {artisan?.trade && <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{artisan.trade}</p>}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Suivi de votre demande</h1>
          {project.createdAt && (
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>
              Demande reçue le {formatDate(project.createdAt)}
            </p>
          )}

          {/* 2. Statut simplifié */}
          <div style={{
            display: 'inline-block', padding: '6px 12px', borderRadius: '999px',
            background: `${primaryColor}1a`, color: primaryColor, fontWeight: 700, fontSize: '13px', marginBottom: '16px',
          }}>
            {project.clientStatus}
          </div>

          <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 4px' }}>
            Votre demande a bien été reçue.
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Aucune création de compte n&apos;est nécessaire.
          </p>
        </div>

        {/* 3. Résumé de la demande */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Votre demande</h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#374151' }}>
            {project.projectType && <p style={{ margin: 0 }}><strong>Type de prestation :</strong> {project.projectType}</p>}
            {project.city && <p style={{ margin: 0 }}><strong>Ville :</strong> {project.city}</p>}
            {project.siteAddress && <p style={{ margin: 0 }}><strong>Adresse :</strong> {project.siteAddress}</p>}
            {project.budget && <p style={{ margin: 0 }}><strong>Budget :</strong> {project.budget}</p>}
            {project.desiredTimeline && <p style={{ margin: 0 }}><strong>Délai souhaité :</strong> {project.desiredTimeline}</p>}
            {project.summary && <p style={{ margin: '8px 0 0', color: '#6b7280' }}>{project.summary}</p>}
          </div>

          {project.photos.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              {project.photos.map((p, i) => (
                <img key={i} src={p.url} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              ))}
            </div>
          )}
        </div>

        {/* Discussion avec l'artisan — bulles façon iOS, réservées aux
            SEULS types de discussion (client_message / artisan_reply).
            Aucune note interne, aucun événement système ici. Repli sur
            l'ancien champ client_messages uniquement si la nouvelle table
            ne renvoie aucun message de discussion. */}
        {(() => {
          const discussionEvents = timelineEvents.filter(
            (ev) => ev.type === 'client_message' || ev.type === 'artisan_reply',
          );
          const legacyMessages = parseLegacyClientMessages(project.clientMessages);
          const useLegacyFallback = discussionEvents.length === 0 && legacyMessages.length > 0;

          return (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Discussion avec l&apos;artisan</h2>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>
                Vos échanges directs avec l&apos;artisan à propos de cette demande.
              </p>

              {discussionEvents.length === 0 && !useLegacyFallback ? (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  Aucun message pour le moment.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {useLegacyFallback
                    ? legacyMessages.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div
                          style={{
                            maxWidth: '78%',
                            background: '#2563eb',
                            color: '#ffffff',
                            borderRadius: '16px 16px 4px 16px',
                            padding: '10px 14px',
                          }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '4px', color: 'rgba(255,255,255,0.85)', textAlign: 'right' }}>
                            Vous{msg.date ? ` · ${msg.date}` : ''}
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    ))
                    : discussionEvents.map((ev) => {
                      const isClient = ev.type === 'client_message';
                      return (
                        <div key={ev.id} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
                          <div
                            style={{
                              maxWidth: '78%',
                              background: isClient ? '#2563eb' : '#f1f5f9',
                              color: isClient ? '#ffffff' : '#111827',
                              border: isClient ? 'none' : '1px solid #e5e7eb',
                              borderRadius: isClient ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              padding: '10px 14px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                marginBottom: '4px',
                                color: isClient ? 'rgba(255,255,255,0.85)' : '#6b7280',
                                textAlign: isClient ? 'right' : 'left',
                              }}
                            >
                              {isClient ? 'Vous' : 'Artisan'}
                              {ev.createdAt ? ` · ${formatDateTimeFr(ev.createdAt)}` : ''}
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {ev.message || ev.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Timeline "Suivi de votre demande" — ne montre que les événements
            système visibles côté client renvoyés par l'API
            (visibility='client'), jamais de discussion (voir section
            ci-dessus) ni de donnée interne. Ordre chronologique croissant
            pour raconter l'histoire de la demande. */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Suivi de votre demande</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>
            L&apos;artisan vous répondra ici lorsque de nouvelles informations seront disponibles.
          </p>

          {(() => {
            const systemEvents = timelineEvents.filter(
              (ev) => ev.type !== 'client_message' && ev.type !== 'artisan_reply',
            );
            if (systemEvents.length === 0) {
              return (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  Votre demande a bien été reçue. Aucun échange pour le moment.
                </p>
              );
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {systemEvents.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderLeft: `3px solid ${sourceColor(ev.source)}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: sourceColor(ev.source) }}>
                        {sourceLabel(ev.source)}
                      </span>
                      {ev.createdAt && (
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDateTimeFr(ev.createdAt)}</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111827' }}>{ev.title}</p>
                    {ev.message && (
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {ev.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {done && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '12px',
            padding: '16px', marginBottom: '20px', color: '#15803d', fontWeight: 600, fontSize: '13px',
          }}>
            Merci, vos informations ont été ajoutées au dossier. L&apos;artisan dispose maintenant
            d&apos;éléments plus complets pour vous répondre.
          </div>
        )}

        {/* 4/5. Compléter les informations */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Informations complémentaires</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
            Vous pouvez compléter les informations ci-dessous pour aider l&apos;artisan à vous répondre plus vite.
            Ces informations seront ajoutées à votre dossier projet.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={120} placeholder="Prénom" />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={120} placeholder="Nom" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="06..." />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="vous@exemple.fr" />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Adresse du chantier</label>
            <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} placeholder="Numéro, rue, ville..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Budget</label>
              <input style={inputStyle} value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={120} placeholder="Ex : 5 000 - 8 000 €" />
            </div>
            <div>
              <label style={labelStyle}>Délai souhaité</label>
              <input style={inputStyle} value={timeline} onChange={(e) => setTimeline(e.target.value)} maxLength={200} placeholder="Ex : dans le mois" />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Disponibilités</label>
            <input style={inputStyle} value={availability} onChange={(e) => setAvailability(e.target.value)} maxLength={300} placeholder="Ex : en semaine après 18h" />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Urgence</label>
            <select style={inputStyle} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="">Non précisé</option>
              <option value="low">Pas urgent</option>
              <option value="normal">Normal</option>
              <option value="high">Urgent</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Précisions complémentaires</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Détails, contraintes, précisions utiles..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              maxLength={4000}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Photos</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              disabled={uploadingPhotos}
              style={{ fontSize: '13px' }}
            />
            {uploadingPhotos && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>Envoi en cours...</p>}
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {photos.map((p, i) => (
                  <img key={i} src={p.url} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                ))}
              </div>
            )}
          </div>

          {/* 7. Message à l'artisan */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Ajouter un message à l&apos;artisan</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Un message pour l'artisan..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              maxLength={2000}
            />
          </div>

          {submitError && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{submitError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              background: primaryColor,
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '15px',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              width: '100%',
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Envoi...' : 'Envoyer mes informations'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>Propulsé par Kadria</p>
      </div>
    </div>
  );
}
