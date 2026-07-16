'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import ClientAppointmentCard, { type ClientPortalAppointment } from '@/src/components/client-portal/ClientAppointmentCard';

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

interface PortalQuote {
  publicStatus: 'no_quote' | 'in_preparation' | 'available' | 'accepted' | 'declined' | 'expired';
  statusLabel: string;
  amount: number | null;
  reference: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  pdfUrl: string | null;
  publicQuoteUrl: string | null;
  depositPaymentUrl: string | null;
  depositAmount: number | null;
  deposit: PortalDeposit | null;
  canAccept: boolean;
  canDecline: boolean;
}

interface PortalDeposit {
  status: 'paid' | 'pending' | 'failed' | 'unavailable';
  publicStatus: 'paid' | 'pending' | 'failed' | 'unavailable';
  amount: number | null;
  paymentUrl: string | null;
  paidAt: string | null;
  canPay: boolean;
  isPaid: boolean;
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

function formatAmount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value} €`;
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
  const token = typeof params.token === 'string' ? params.token : '';

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [artisan, setArtisan] = useState<ArtisanBranding | null>(null);
  const [project, setProject] = useState<PortalProject | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [quote, setQuote] = useState<PortalQuote | null>(null);
  const [appointments, setAppointments] = useState<ClientPortalAppointment[]>([]);
  const [appointmentErrors, setAppointmentErrors] = useState<Record<string, string>>({});
  const [appointmentError, setAppointmentError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');

  const [photos, setPhotos] = useState<{ url: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compactage d'affichage de la timeline système (aucune suppression de
  // donnée) : si plusieurs événements 'client_info_updated' s'accumulent,
  // on n'affiche par défaut que les 3 plus récents + un texte "+ X
  // événements précédents" à déplier.
  const [showAllSystemEvents, setShowAllSystemEvents] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  // Snapshot des valeurs de référence pour le gating du bouton "Envoyer mes
  // informations" (anti-spam front) : le bouton n'est actif que si au moins
  // un champ diffère réellement (après trim) du snapshot. Mis à jour après
  // chaque envoi réussi pour repasser hasChanges à false.
  type FormSnapshot = {
    firstName: string; lastName: string; email: string; phone: string; address: string;
     budget: string; timeline: string; details: string;
    message: string; photos: string;
  };
  const [snapshot, setSnapshot] = useState<FormSnapshot | null>(null);

  const currentSnapshot = (): FormSnapshot => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    address: address.trim(),
    budget: budget.trim(),
    timeline: timeline.trim(),
    details: details.trim(),
    message: message.trim(),
    photos: JSON.stringify(photos.map((p) => p.url)),
  });

  const hasChanges = snapshot
    ? Object.entries(currentSnapshot()).some(([key, value]) => value !== snapshot[key as keyof FormSnapshot])
    : false;

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
        setQuote(data.quote || null);
        setAppointments(Array.isArray(data.appointments) ? data.appointments : data.appointment ? [data.appointment] : []);
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
        setSnapshot({
          firstName: (data.project?.clientFirstName || '').trim(),
          lastName: (data.project?.clientLastName || '').trim(),
          email: (data.project?.clientEmail || '').trim(),
          phone: (data.project?.clientPhone || '').trim(),
          address: (data.project?.siteAddress || '').trim(),
          budget: (data.project?.budget || '').trim(),
          timeline: (data.project?.desiredTimeline || '').trim(),
          details: '',
          message: '',
          photos: JSON.stringify([]),
        });
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    };
    if (!token) return;
    void load();
  }, [token]);

  // Rafraîchit uniquement la timeline après un envoi (refetch simple, plus
  // sûr qu'une mise à jour optimiste pour ce lot V1).
  const refetchPortal = async () => {
    try {
      const res = await fetch(`/api/client-portal/${token}`);
      const data = await res.json();
      if (res.ok) {
        setTimelineEvents(Array.isArray(data.timelineEvents) ? data.timelineEvents : []);
        setAppointments(Array.isArray(data.appointments) ? data.appointments : data.appointment ? [data.appointment] : []);
      }
    } catch {
      // non bloquant
    }
  };

  const handleAppointmentResponse = async (appointmentId: string, input: { status: 'confirmed' | 'change_requested' | 'cancelled'; note: string; requestId: string; expectedVersion: number }) => {
    setAppointmentErrors((current) => ({ ...current, [appointmentId]: '' }));
    const response = await fetch(`/api/client-portal/${token}/appointments/${appointmentId}/confirmation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      if (data?.errorCode === 'APPOINTMENT_VERSION_CONFLICT') {
        const refreshed = await fetch(`/api/client-portal/${token}`).then((item) => item.json()).catch(() => null);
        if (Array.isArray(refreshed?.appointments)) setAppointments(refreshed.appointments);
        else if (refreshed?.appointment) setAppointments([refreshed.appointment]);
      }
      setAppointmentError(data?.error || 'Votre réponse n’a pas pu être enregistrée. Réessayez dans un instant.');
      return;
    }
    setAppointments((current) => current.map((appointment) => appointment.id === appointmentId ? data.appointment : appointment));
    await refetchPortal();
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
    if (!hasChanges || submitting) return;

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
      // Snapshot mis à jour avec les nouvelles valeurs enregistrées :
      // hasChanges repasse à false, empêchant un second envoi identique
      // (double-clic / re-clic) tant que rien n'est modifié à nouveau.
      setSnapshot({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        budget: budget.trim(),
        timeline: timeline.trim(),
        details: '',
        message: '',
        photos: JSON.stringify([]),
      });
       await refetchPortal();
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

  if (loading && token) {
    return (
      <div style={pageWrapperStyle}>
        <p style={{ color: '#6b7280' }}>Chargement...</p>
      </div>
    );
  }

  if (!token || invalid || !project) {
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
      <div className="max-w-[640px] lg:max-w-6xl mx-auto px-5 lg:px-8 py-8 lg:py-10">

        {/* 1. Header artisan */}
        <div className="lg:justify-start" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
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

        <div className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.8fr)] lg:gap-6 lg:items-start">
        <div className="lg:min-w-0">

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
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-6" style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#374151' }}>
            {project.projectType && <p style={{ margin: 0 }}><strong>Type de prestation :</strong> {project.projectType}</p>}
            {project.city && <p style={{ margin: 0 }}><strong>Ville :</strong> {project.city}</p>}
            {project.siteAddress && <p style={{ margin: 0 }}><strong>Adresse :</strong> {project.siteAddress}</p>}
            {project.budget && <p style={{ margin: 0 }}><strong>Budget :</strong> {project.budget}</p>}
            {project.desiredTimeline && <p style={{ margin: 0 }}><strong>Délai souhaité :</strong> {project.desiredTimeline}</p>}
            {project.summary && <p className="lg:col-span-2" style={{ margin: '8px 0 0', color: '#6b7280' }}>{project.summary}</p>}
          </div>

          {project.photos.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              {project.photos.map((p, i) => (
                <img key={i} src={p.url} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              ))}
            </div>
          )}
        </div>

        {/* Votre devis — affichage strictement public (montant, statut,
            PDF, éventuel lien d'acompte déjà existant). L'acceptation et le
            refus restent gérés par la page publique existante /devis/[token]
            (sa propre protection anti-abus et son idempotence ne sont pas
            dupliquées ici, voir le rapport de lot). */}
        {quote && (
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Votre devis</h2>

            {quote.publicStatus === 'no_quote' && (
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '8px 0 0' }}>
                Votre devis n&apos;est pas encore disponible. L&apos;artisan pourra le déposer ici lorsqu&apos;il sera prêt.
              </p>
            )}

            {quote.publicStatus === 'in_preparation' && (
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '8px 0 0' }}>
                Votre devis est en préparation.
              </p>
            )}

            {(quote.publicStatus === 'available' || quote.publicStatus === 'accepted' || quote.publicStatus === 'declined' || quote.publicStatus === 'expired') && (
              <div>
                <div style={{
                  display: 'inline-block', padding: '6px 12px', borderRadius: '999px', margin: '8px 0 12px',
                  background: quote.publicStatus === 'accepted' ? '#dcfce7' : quote.publicStatus === 'declined' ? '#fee2e2' : '#eef2ff',
                  color: quote.publicStatus === 'accepted' ? '#15803d' : quote.publicStatus === 'declined' ? '#b91c1c' : '#3730a3',
                  fontWeight: 700, fontSize: '13px',
                }}>
                  {quote.statusLabel}
                </div>

                <div style={{ display: 'grid', gap: '6px', fontSize: '13px', color: '#374151', marginBottom: '14px' }}>
                  {quote.reference && <p style={{ margin: 0 }}><strong>Référence :</strong> {quote.reference}</p>}
                  {quote.amount !== null && <p style={{ margin: 0 }}><strong>Montant :</strong> {formatAmount(quote.amount)}</p>}
                  {quote.sentAt && <p style={{ margin: 0 }}><strong>Envoyé le :</strong> {formatDate(quote.sentAt)}</p>}
                  {quote.publicStatus === 'accepted' && quote.acceptedAt && (
                    <p style={{ margin: 0 }}><strong>Accepté le :</strong> {formatDate(quote.acceptedAt)}</p>
                  )}
                  {quote.publicStatus === 'declined' && quote.declinedAt && (
                    <p style={{ margin: 0 }}><strong>Refusé le :</strong> {formatDate(quote.declinedAt)}</p>
                  )}
                  {quote.publicStatus === 'declined' && quote.declineReason && (
                    <p style={{ margin: 0 }}><strong>Motif :</strong> {quote.declineReason}</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {quote.pdfUrl && (
                    <a
                      href={quote.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', background: primaryColor, color: '#fff', fontWeight: 700,
                        fontSize: '13px', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none',
                      }}
                    >
                      Voir le devis
                    </a>
                  )}
                  {quote.publicQuoteUrl && quote.publicStatus === 'available' && (
                    <a
                      href={quote.publicQuoteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', background: '#f1f5f9', color: '#111827', fontWeight: 700,
                        fontSize: '13px', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      Répondre au devis (accepter / refuser)
                    </a>
                  )}
                </div>

                {(() => {
                  const deposit = quote.deposit;
                  const depositAmount = deposit?.amount ?? quote.depositAmount;
                  const depositUrl = deposit?.paymentUrl ?? quote.depositPaymentUrl;

                  // Acompte payé : badge vert compact, aucun CTA de paiement.
                  if (deposit?.isPaid) {
                    return (
                      <div>
                        <div style={{
                          display: 'inline-block', padding: '6px 12px', borderRadius: '999px', margin: '0 0 8px',
                          background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '13px',
                        }}>
                          Acompte payé
                        </div>
                        <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                          {depositAmount !== null ? `Acompte de ${formatAmount(depositAmount)} réglé.` : 'Acompte réglé.'}
                          {deposit.paidAt ? ` Payé le ${formatDate(deposit.paidAt)}.` : ''}
                        </p>
                      </div>
                    );
                  }

                  // Paiement en cours de confirmation : pas de CTA.
                  if (deposit?.status === 'pending') {
                    return (
                      <div>
                        <div style={{
                          display: 'inline-block', padding: '6px 12px', borderRadius: '999px', margin: '0 0 8px',
                          background: '#dbeafe', color: '#1e40af', fontWeight: 700, fontSize: '13px',
                        }}>
                          Paiement en cours
                        </div>
                        <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                          Le paiement de l&apos;acompte est en cours de confirmation.
                        </p>
                      </div>
                    );
                  }

                  // Échec / annulation : proposer de réessayer si un lien
                  // valide existe encore, sinon message neutre.
                  if (deposit?.status === 'failed') {
                    return (
                      <div>
                        <div style={{
                          display: 'inline-block', padding: '6px 12px', borderRadius: '999px', margin: '0 0 8px',
                          background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '13px',
                        }}>
                          Paiement non finalisé
                        </div>
                        {depositUrl ? (
                          <a
                            href={depositUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block', background: '#111827', color: '#fff', fontWeight: 700,
                              fontSize: '13px', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none',
                            }}
                          >
                            Réessayer le paiement
                          </a>
                        ) : (
                          <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                            Paiement non disponible.
                          </p>
                        )}
                      </div>
                    );
                  }

                  // Pas de statut payé/en attente/échoué mais un lien valide
                  // existe : comportement historique, bouton de paiement.
                  if (deposit?.canPay && depositUrl) {
                    return (
                      <a
                        href={depositUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block', background: '#111827', color: '#fff', fontWeight: 700,
                          fontSize: '13px', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none',
                        }}
                      >
                        {depositAmount !== null ? `Régler l'acompte (${formatAmount(depositAmount)})` : "Régler l'acompte"}
                      </a>
                    );
                  }

                  return (
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                      Le paiement d&apos;un acompte n&apos;est pas encore disponible pour ce projet.
                    </p>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {appointments.length > 0 && <section style={{ marginBottom: '20px' }}><h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Vos rendez-vous</h2>{appointments.map((appointment) => <div key={appointment.id}><ClientAppointmentCard appointment={appointment} onSubmit={handleAppointmentResponse} />{appointmentErrors[appointment.id] && <p role="alert" style={{ margin: '-8px 0 16px', color: '#b91c1c', fontSize: '13px' }}>{appointmentErrors[appointment.id]}</p>}</div>)}</section>}
        {appointmentError && <p role="alert" style={{ margin: '-8px 0 16px', color: '#b91c1c', fontSize: '13px' }}>{appointmentError}</p>}

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
                <div className="lg:max-h-[520px] lg:overflow-y-auto lg:pr-1" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            // Compactage : parmi les événements 'client_info_updated', on ne
            // garde visibles par défaut que les 3 plus récents (les autres
            // types d'événements restent toujours affichés). Rien n'est
            // supprimé côté données, uniquement replié à l'affichage.
            const infoUpdateIdx = systemEvents
              .map((ev, i) => ({ ev, i }))
              .filter((x) => x.ev.type === 'client_info_updated');
            const hiddenCount = Math.max(0, infoUpdateIdx.length - 3);
            const hiddenIndexSet = new Set(
              hiddenCount > 0 ? infoUpdateIdx.slice(0, hiddenCount).map((x) => x.i) : [],
            );
            const visibleEvents = showAllSystemEvents
              ? systemEvents
              : systemEvents.filter((_, i) => !hiddenIndexSet.has(i));

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {hiddenCount > 0 && !showAllSystemEvents && (
                  <button
                    type="button"
                    onClick={() => setShowAllSystemEvents(true)}
                    style={{
                      alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
                      fontSize: '12px', color: '#6b7280', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    + {hiddenCount} événement{hiddenCount > 1 ? 's' : ''} précédent{hiddenCount > 1 ? 's' : ''}
                  </button>
                )}
                {visibleEvents.map((ev) => (
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

        </div>
        {/* Colonne latérale (desktop) : formulaire + rappel */}
        <div className="lg:sticky lg:top-6 lg:self-start">

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
            disabled={submitting || !hasChanges}
            style={{
              background: submitting || !hasChanges ? '#e5e7eb' : primaryColor,
              color: submitting || !hasChanges ? '#9ca3af' : '#ffffff',
              fontWeight: 700,
              fontSize: '15px',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              width: '100%',
              cursor: submitting || !hasChanges ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Envoi...' : 'Envoyer mes informations'}
          </button>
          {!submitting && !hasChanges && (
            <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '8px' }}>
              Modifiez une information pour l&apos;envoyer.
            </p>
          )}
        </div>

        <div style={{
          background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px',
          padding: '12px 16px', marginBottom: '20px', color: '#6b7280', fontSize: '12px', textAlign: 'center',
        }}>
          Aucune création de compte n&apos;est nécessaire pour suivre votre demande.
        </div>

        </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>Propulsé par Kadria</p>
      </div>
    </div>
  );
}
