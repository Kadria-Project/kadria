'use client';

// Portail client - DEMO. Reproduit le rendu de app/client/projet/[token]/page.tsx
// (memes sections : header artisan, statut, resume, devis, discussion, timeline,
// formulaire de complement, anti-spam) mais sans aucun appel reseau : les
// donnees viennent de DemoModeContext (fictives, locales), et toute action
// (envoi d'infos, message, acompte) est simulee. Jamais de vraie ecriture,
// jamais de vrai paiement.

import { useState, type CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import { useDemoMode } from '@/src/contexts/DemoModeContext';
import { buildDemoDevisList } from '@/src/lib/demo-data';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'K';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatDateTimeFr(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} EUR`;
  }
}

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px',
  fontSize: '14px',
  fontFamily: 'inherit',
  color: '#111827',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
};

export default function DemoClientPortalPage() {
  const params = useParams();
  const id = params.id as string;
  const { projects, artisan, clientEvents, addClientEvent, updateProjectFields } = useDemoMode();
  const project = projects.find((entry) => entry.id === id) || null;

  const [firstName, setFirstName] = useState(project?.clientFirstName || '');
  const [lastName, setLastName] = useState(project?.clientName || '');
  const [email, setEmail] = useState(project?.clientEmail || '');
  const [phone, setPhone] = useState(project?.clientPhone || '');
  const [address, setAddress] = useState(project?.siteAddress || '');
  const [budget, setBudget] = useState(project?.budget || '');
  const [timeline, setTimeline] = useState(project?.desiredTimeline || '');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [snapshotKey, setSnapshotKey] = useState('');
  const [done, setDone] = useState(false);
  const [depositToast, setDepositToast] = useState<string | null>(null);

  if (!project) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ textAlign: 'center', color: '#374151' }}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#9ca3af',
              letterSpacing: '1px',
              marginBottom: '12px',
            }}
          >
            KADRIA - DEMO
          </p>
          <p>Lien invalide ou expire (simulation demo).</p>
        </div>
      </div>
    );
  }

  const primaryColor = artisan.primaryColor || '#16a34a';
  const brandName = artisan.widgetBrandName || artisan.companyName || 'Kadria';
  const devisList = buildDemoDevisList(project);
  const devis = devisList[0] || null;

  const currentSnapshot = () =>
    JSON.stringify({ firstName, lastName, email, phone, address, budget, timeline, details, message });
  const hasChanges = currentSnapshot() !== snapshotKey;

  const events = clientEvents[project.id] || [];
  const discussionEvents = events.filter((ev) => ev.type === 'client_message' || ev.type === 'artisan_reply');
  const systemEvents = events.filter((ev) => ev.type !== 'client_message' && ev.type !== 'artisan_reply');

  const handleSubmit = () => {
    if (!hasChanges) return;
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;

    const detailsText = details.trim();
    const messageText = message.trim();
    const updatedAt = new Date().toISOString();

    updateProjectFields(project.id, {
      clientFirstName: firstName.trim() || project.clientFirstName,
      clientName: lastName.trim() || project.clientName,
      clientEmail: email.trim() || project.clientEmail,
      clientPhone: phone.trim() || project.clientPhone,
      siteAddress: address.trim() || project.siteAddress,
      budget: budget.trim() || project.budget,
      desiredTimeline: timeline.trim() || project.desiredTimeline,
      aiSummary:
        detailsText.length > 0
          ? `${project.aiSummary} Complement client (demo) : ${detailsText}`
          : project.aiSummary,
      updatedAt,
      lastInteractionAt: updatedAt,
      activity: [
        ...(project.activity || []),
        {
          id: `demo_${project.id}_client_update_${Date.now()}`,
          label: messageText
            ? 'Le client a complete ses informations et laisse un message'
            : 'Le client a complete ses informations',
          date: updatedAt,
          kind: 'project',
        },
      ],
    });

    addClientEvent(project.id, {
      type: 'client_info_updated',
      title: 'Informations completees par le client (demo)',
      message: [detailsText, messageText].filter(Boolean).join(' - ') || null,
      source: 'client',
    });
    if (messageText) {
      addClientEvent(project.id, {
        type: 'client_message',
        title: 'Message client',
        message: messageText,
        source: 'client',
      });
    }

    setDetails('');
    setMessage('');
    setDone(true);
    setSnapshotKey(
      JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        address,
        budget,
        timeline,
        details: '',
        message: '',
      }),
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#111827' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: primaryColor,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
            }}
          >
            {initials(brandName)}
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{brandName}</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{artisan.primaryTrade}</p>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '28px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: '20px',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Suivi de votre demande</h1>
          {project.createdAt && (
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>
              Demande recue le {formatDate(project.createdAt)}
            </p>
          )}
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '999px',
              background: `${primaryColor}1a`,
              color: primaryColor,
              fontWeight: 700,
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {project.status}
          </div>
          <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 4px' }}>
            Votre demande a bien ete recue.
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Aucune creation de compte n&apos;est necessaire.
          </p>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Votre demande</h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#374151' }}>
            {project.projectType && (
              <p style={{ margin: 0 }}>
                <strong>Type de prestation :</strong> {project.projectType}
              </p>
            )}
            {project.city && (
              <p style={{ margin: 0 }}>
                <strong>Ville :</strong> {project.city}
              </p>
            )}
            {project.siteAddress && (
              <p style={{ margin: 0 }}>
                <strong>Adresse :</strong> {project.siteAddress}
              </p>
            )}
            {project.budget && (
              <p style={{ margin: 0 }}>
                <strong>Budget :</strong> {project.budget}
              </p>
            )}
            {project.desiredTimeline && (
              <p style={{ margin: 0 }}>
                <strong>Delai souhaite :</strong> {project.desiredTimeline}
              </p>
            )}
            {project.aiSummary && <p style={{ margin: '8px 0 0', color: '#6b7280' }}>{project.aiSummary}</p>}
          </div>
          {project.photos.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              {project.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo.thumbnailUrl || photo.url}
                  alt=""
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {devis && (
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Votre devis</h2>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: '999px',
                margin: '8px 0 12px',
                background: devis.accepted ? '#dcfce7' : devis.declined ? '#fee2e2' : '#eef2ff',
                color: devis.accepted ? '#15803d' : devis.declined ? '#b91c1c' : '#3730a3',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              {devis.statut}
            </div>
            <div style={{ display: 'grid', gap: '6px', fontSize: '13px', color: '#374151', marginBottom: '14px' }}>
              <p style={{ margin: 0 }}>
                <strong>Reference :</strong> {devis.numero}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Montant :</strong> {formatAmount(devis.amount)}
              </p>
              {devis.date_emission && (
                <p style={{ margin: 0 }}>
                  <strong>Envoye le :</strong> {formatDate(devis.date_emission)}
                </p>
              )}
              {devis.accepted && devis.accepted_at && (
                <p style={{ margin: 0 }}>
                  <strong>Accepte le :</strong> {formatDate(devis.accepted_at)}
                </p>
              )}
              {devis.declined && devis.declined_at && (
                <p style={{ margin: 0 }}>
                  <strong>Refuse le :</strong> {formatDate(devis.declined_at)}
                </p>
              )}
              {devis.declined && devis.decline_reason && (
                <p style={{ margin: 0 }}>
                  <strong>Motif :</strong> {devis.decline_reason}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: primaryColor,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  opacity: 0.9,
                }}
              >
                PDF fictif de demonstration
              </span>
            </div>
            {/* Acompte — reprend le vocabulaire public de src/lib/deposit.ts
                (paid/pending/failed/unavailable), sur les champs depositStatus/
                depositAmount portes par DemoProject. Simulation uniquement :
                aucun vrai lien Stripe, aucun paiement reel. */}
            {(() => {
              const depositStatus = project.depositStatus || 'not_requested';
              const depositAmount = project.depositAmount || (devis.amount ? Math.round(devis.amount * 0.3) : 0);

              if (depositStatus === 'paid') {
                return (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#dcfce7',
                      color: '#15803d',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '10px 16px',
                      borderRadius: '8px',
                    }}
                  >
                    ✓ Acompte payé{depositAmount ? ` (${formatAmount(depositAmount)})` : ''}
                  </div>
                );
              }

              if (depositStatus === 'requested') {
                return (
                  <>
                    <button
                      onClick={() => {
                        updateProjectFields(project.id, { depositStatus: 'paid', depositPaidAt: new Date().toISOString() });
                        setDepositToast('Paiement simulé dans la démo — merci, votre acompte est marqué comme réglé.');
                        window.setTimeout(() => setDepositToast(null), 5000);
                      }}
                      style={{
                        display: 'inline-block',
                        background: '#111827',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {depositAmount ? `Régler l'acompte (${formatAmount(depositAmount)}) - démo` : "Régler l'acompte - démo"}
                    </button>
                    <p style={{ marginTop: '8px', fontSize: '12px', color: '#92400e', fontWeight: 600 }}>Paiement en cours de traitement.</p>
                  </>
                );
              }

              if (depositStatus === 'cancelled') {
                return (
                  <>
                    <p style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600, margin: '0 0 8px' }}>Le paiement précédent n&apos;a pas abouti.</p>
                    <button
                      onClick={() => {
                        updateProjectFields(project.id, { depositStatus: 'requested', depositRequestedAt: new Date().toISOString() });
                        setDepositToast('Simulation : nouvelle tentative de paiement (démo).');
                        window.setTimeout(() => setDepositToast(null), 5000);
                      }}
                      style={{
                        display: 'inline-block',
                        background: '#111827',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Réessayer - démo
                    </button>
                  </>
                );
              }

              return (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Acompte non disponible pour le moment.</p>
              );
            })()}
            {depositToast && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                {depositToast}
              </p>
            )}
          </div>
        )}

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Discussion avec l&apos;artisan</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>
            Vos echanges directs avec l&apos;artisan a propos de cette demande (demo).
          </p>
          {discussionEvents.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Aucun message pour le moment.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {discussionEvents.map((ev) => {
                const isClient = ev.type === 'client_message';
                return (
                  <div key={ev.id} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        maxWidth: '78%',
                        background: isClient ? '#2563eb' : '#f1f5f9',
                        color: isClient ? '#fff' : '#111827',
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
                        {isClient ? 'Vous' : 'Artisan'} - {formatDateTimeFr(ev.createdAt)}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {ev.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Suivi de votre demande</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>
            Historique visible cote client (demo).
          </p>
          {systemEvents.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              Votre demande a bien ete recue. Aucun echange pour le moment.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {systemEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderLeft: '3px solid #6b7280',
                    borderRadius: '10px',
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '8px',
                      marginBottom: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>Kadria</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDateTimeFr(ev.createdAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111827' }}>{ev.title}</p>
                  {ev.message && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '13px',
                        color: '#374151',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {ev.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {done && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #22c55e',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              color: '#15803d',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Simulation : vos informations ont ete ajoutees au dossier demo. Aucune donnee reelle n&apos;a ete modifiee.
          </div>
        )}

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Informations complementaires</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
            Completez ces informations pour voir la demo reagir (simulation, rien n&apos;est enregistre cote
            serveur).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Prenom</label>
              <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={120} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Telephone</label>
              <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Adresse du chantier</label>
            <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Budget</label>
              <input style={inputStyle} value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label style={labelStyle}>Delai souhaite</label>
              <input
                style={inputStyle}
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Precisions complementaires</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              maxLength={4000}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Details, contraintes, precisions utiles..."
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Ajouter un message a l&apos;artisan</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Un message pour l'artisan..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!hasChanges}
            style={{
              background: !hasChanges ? '#e5e7eb' : primaryColor,
              color: !hasChanges ? '#9ca3af' : '#fff',
              fontWeight: 700,
              fontSize: '15px',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              width: '100%',
              cursor: !hasChanges ? 'not-allowed' : 'pointer',
            }}
          >
            Envoyer mes informations (demo)
          </button>
          {!hasChanges && (
            <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '8px' }}>
              Modifiez une information pour l&apos;envoyer.
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>
          Propulse par Kadria - mode demo, donnees fictives
        </p>
      </div>
    </div>
  );
}
