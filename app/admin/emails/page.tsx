'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface ClientRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  statut: string;
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  sent_at: string;
  status: string;
  resend_id: string;
  admin_email: string;
}

const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  'Bienvenue': {
    subject: 'Bienvenue chez Kadria',
    body: "Bienvenue dans l'aventure Kadria ! Nous sommes ravis de vous accompagner dans la gestion de vos chantiers.",
  },
  'Relance trial': {
    subject: 'Votre essai Kadria arrive à échéance',
    body: "Votre période d'essai se termine bientôt. Pensez à choisir votre plan pour continuer à profiter de Kadria.",
  },
  'Paiement': {
    subject: 'Information sur votre facturation Kadria',
    body: 'Nous souhaitions vous contacter au sujet de votre facturation Kadria.',
  },
  'Nouveauté': {
    subject: 'Nouveauté sur Kadria',
    body: "Nous sommes heureux de vous annoncer une nouvelle fonctionnalité sur Kadria !",
  },
  'Vide': { subject: '', body: '' },
};

const card: React.CSSProperties = {
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '16px',
  padding: '28px',
};

const label: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#71717a',
  fontWeight: 700,
  marginBottom: '6px',
  display: 'block',
};

function formatDateTime(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}

const inputStyle: React.CSSProperties = {
  background: '#09090b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  padding: '10px 12px',
  width: '100%',
  boxSizing: 'border-box',
};

export default function AdminEmailsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [destinataire, setDestinataire] = useState('actifs');
  const [manualEmail, setManualEmail] = useState('');
  const [template, setTemplate] = useState('Vide');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setClients(data);
      })
      .catch(() => {});

    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/email-logs');
      const data = await res.json();
      if (!data.error) setEmailLogs(data);
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }

  function applyTemplate(name: string) {
    setTemplate(name);
    const tpl = EMAIL_TEMPLATES[name];
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  }

  async function handleSend() {
    if (!subject || !body) {
      setFeedback('Objet et corps du message requis');
      return;
    }

    let recipients: { email: string; name: string }[] = [];
    if (destinataire === 'actifs') {
      recipients = clients
        .filter((c) => c.statut === 'Actif')
        .map((c) => ({ email: c.email, name: `${c.first_name} ${c.last_name}`.trim() }));
    } else if (destinataire === 'trial') {
      recipients = clients
        .filter((c) => c.statut === 'Trial')
        .map((c) => ({ email: c.email, name: `${c.first_name} ${c.last_name}`.trim() }));
    } else {
      if (!manualEmail) {
        setFeedback('Veuillez saisir une adresse email');
        return;
      }
      recipients = [{ email: manualEmail, name: '' }];
    }

    if (recipients.length === 0) {
      setFeedback('Aucun destinataire trouvé');
      return;
    }

    setSending(true);
    setFeedback('');

    try {
      let success = 0;
      let failed = 0;
      for (const recipient of recipients) {
        const res = await fetch('/api/admin/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipient.email,
            subject,
            body,
            client_name: recipient.name,
          }),
        });
        const data = await res.json();
        if (data.error) failed += 1;
        else success += 1;
      }

      setFeedback(
        failed === 0
          ? `${success} email${success > 1 ? 's' : ''} envoyé${success > 1 ? 's' : ''} avec succès`
          : `${success} envoyé(s), ${failed} échec(s)`
      );

      if (success > 0) {
        await fetchLogs();
        setSubject('');
        setBody('');
        setTemplate('Vide');
      }
    } catch {
      setFeedback("Erreur lors de l'envoi des emails");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Emails</h1>
        <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '4px 0 0' }}>
          Envoyez des emails à vos clients depuis Kadria
        </p>
      </div>

      <div style={{ ...card, marginBottom: '24px' }}>
        <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 20px' }}>Nouvel email</p>

        <div style={{ marginBottom: '16px' }}>
          <span style={label}>Destinataire</span>
          <select style={inputStyle} value={destinataire} onChange={(e) => setDestinataire(e.target.value)}>
            <option value="actifs">Tous les clients actifs</option>
            <option value="trial">Tous les clients en trial</option>
            <option value="manuel">Saisir un email manuellement</option>
          </select>
          {destinataire === 'manuel' && (
            <input
              type="email"
              placeholder="client@exemple.com"
              style={{ ...inputStyle, marginTop: '8px' }}
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
            />
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <span style={label}>Modèles rapides</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.keys(EMAIL_TEMPLATES).map((name) => (
              <button
                key={name}
                onClick={() => applyTemplate(name)}
                style={{
                  background: template === name ? 'rgba(34,197,94,0.1)' : '#27272a',
                  color: template === name ? '#22c55e' : '#ffffff',
                  border: template === name ? '1px solid rgba(34,197,94,0.3)' : '1px solid #27272a',
                  borderRadius: '999px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <span style={label}>Objet</span>
          <input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <span style={label}>Corps</span>
          <textarea
            rows={8}
            placeholder="Rédigez votre message..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {feedback && (
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 12px' }}>{feedback}</p>
        )}

        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            background: '#22c55e',
            color: '#09090b',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 32px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          {sending ? 'Envoi en cours...' : 'Envoyer via Resend →'}
        </button>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>Historique</p>
          <button
            onClick={fetchLogs}
            aria-label="Rafraîchir l'historique"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={14} className={logsLoading ? 'admin-spin' : ''} />
          </button>
        </div>

        {logsLoading && emailLogs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="admin-skeleton" style={{ background: '#27272a', borderRadius: '8px', height: '48px' }} />
            ))}
          </div>
        )}

        {!logsLoading && emailLogs.length === 0 && (
          <p style={{ fontSize: '13px', color: '#71717a', textAlign: 'center', padding: '32px 0', margin: 0 }}>
            Aucun email envoyé pour l&apos;instant
          </p>
        )}

        {emailLogs.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Destinataire</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Objet</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Envoyé le</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', fontWeight: 700 }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderTop: '1px solid #27272a' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#27272a')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{log.to}</td>
                    <td
                      style={{
                        padding: '10px 12px',
                        color: '#a1a1aa',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.subject}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#a1a1aa' }}>{formatDateTime(log.sent_at)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {log.status === 'sent' ? (
                        <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                          ✓ Envoyé
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                          ✗ Erreur
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes admin-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .admin-spin { animation: admin-spin 1s linear infinite; }
        @keyframes admin-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .admin-skeleton { animation: admin-pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
