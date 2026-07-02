'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function CompleterPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [clientFirstName, setClientFirstName] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/completer/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setInvalid(true);
          return;
        }
        setClientFirstName(data.clientFirstName || '');
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

  const handleSubmit = async () => {
    if (!details.trim()) {
      setSubmitError('Merci de renseigner quelques précisions.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/completer/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: details.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Erreur lors de l\'enregistrement');
        return;
      }
      setDone(true);
    } catch {
      setSubmitError('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (invalid) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <p>Lien invalide ou expiré.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #22c55e',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '480px',
          textAlign: 'center',
          color: '#15803d',
          fontWeight: 600,
        }}>
          ✓ Merci, vos précisions ont bien été transmises à l&apos;artisan.
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', marginBottom: '8px' }}>
          KADRIA
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>
          {clientFirstName ? `Bonjour ${clientFirstName},` : 'Bonjour,'}
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
          Merci pour votre appel. Vous pouvez ajouter ici toute précision utile pour votre projet
          (détails, contraintes, disponibilités...).
        </p>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Précisions complémentaires..."
          rows={6}
          style={{
            width: '100%',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            marginBottom: '16px',
            color: '#111827',
          }}
        />

        {submitError && (
          <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{submitError}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: '#16a34a',
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
          {submitting ? 'Envoi...' : 'Envoyer mes précisions'}
        </button>
      </div>
    </div>
  );
}
