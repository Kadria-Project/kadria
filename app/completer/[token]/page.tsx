'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface AdresseSuggestion {
  label: string;
  city: string;
  postcode: string;
  score: number | null;
  latitude: number | null;
  longitude: number | null;
}

// Même pattern que ChatWidgetInline.tsx : recherche adresse via l'API
// publique adresse.data.gouv.fr, sans clé, avec repli manuel si échec.
async function fetchAdresses(q: string): Promise<AdresseSuggestion[] | null> {
  if (q.length < 3) return [];
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      label: f.properties.label,
      city: f.properties.city,
      postcode: f.properties.postcode,
      score: typeof f.properties.score === 'number' ? f.properties.score : null,
      longitude: f.geometry?.coordinates?.[0] ?? null,
      latitude: f.geometry?.coordinates?.[1] ?? null,
    }));
  } catch {
    return null;
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

export default function CompleterPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [clientFirstName, setClientFirstName] = useState('');
  const [needSummary, setNeedSummary] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSelected, setAddressSelected] = useState<AdresseSuggestion | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AdresseSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressUnavailable, setAddressUnavailable] = useState(false);
  const addressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [details, setDetails] = useState('');

  const [photos, setPhotos] = useState<{ url: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (data.alreadyCompleted) {
          setAlreadyCompleted(true);
          setClientFirstName(data.clientFirstName || '');
          return;
        }
        setClientFirstName(data.clientFirstName || '');
        setNeedSummary(data.needSummary || '');
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

  // Recherche adresse avec debounce ~300ms, minimum 3 caractères.
  useEffect(() => {
    if (addressTimer.current) clearTimeout(addressTimer.current);
    if (addressSelected) return;
    if (addressQuery.trim().length < 3) {
      setAddressSuggestions([]);
      setAddressUnavailable(false);
      return;
    }
    addressTimer.current = setTimeout(async () => {
      setAddressLoading(true);
      const results = await fetchAdresses(addressQuery.trim());
      setAddressLoading(false);
      if (results === null) {
        setAddressUnavailable(true);
        setAddressSuggestions([]);
      } else {
        setAddressUnavailable(false);
        setAddressSuggestions(results);
      }
    }, 300);
    return () => {
      if (addressTimer.current) clearTimeout(addressTimer.current);
    };
  }, [addressQuery, addressSelected]);

  const handleSelectAddress = (s: AdresseSuggestion) => {
    setAddressSelected(s);
    setAddressQuery(s.label);
    setAddressSuggestions([]);
  };

  const handleAddressChange = (value: string) => {
    setAddressQuery(value);
    setAddressSelected(null);
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
      // upload photo non bloquant
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    const trimmedDetails = details.trim();
    const addressLabel = addressSelected?.label || addressQuery.trim();

    if (!addressLabel && !trimmedDetails) {
      setSubmitError('Merci de renseigner votre adresse ou quelques précisions.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSubmitError('Adresse email invalide.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/completer/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          address: addressLabel
            ? {
                label: addressLabel,
                city: addressSelected?.city || '',
                postcode: addressSelected?.postcode || '',
                latitude: addressSelected?.latitude ?? null,
                longitude: addressSelected?.longitude ?? null,
                source: addressSelected ? 'api' : 'manual',
              }
            : undefined,
          details: trimmedDetails,
          photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      setDone(true);
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

  if (invalid) {
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

  if (alreadyCompleted) {
    return (
      <div style={pageWrapperStyle}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '480px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', marginBottom: '12px' }}>
            KADRIA
          </p>
          <p style={{ fontSize: '15px', color: '#374151', fontWeight: 600 }}>
            Ce dossier{clientFirstName ? ` de ${clientFirstName}` : ''} a déjà été complété. Merci !
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={pageWrapperStyle}>
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
          ✓ Merci, votre dossier est complété. L&apos;entreprise dispose maintenant des informations
          nécessaires pour vous recontacter.
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#111827' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', marginBottom: '8px' }}>
            KADRIA
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
            Compléter votre demande
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
            Ces informations aideront l&apos;entreprise à vous recontacter avec un dossier clair.
          </p>

          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
              Bonjour,
            </p>
            {needSummary && (
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>{needSummary}</p>
            )}
            <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, margin: 0 }}>Dossier reçu</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input
                style={inputStyle}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                maxLength={120}
              />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input
                style={inputStyle}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                maxLength={120}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              maxLength={200}
            />
          </div>

          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label style={labelStyle}>Adresse du chantier</label>
            <input
              style={inputStyle}
              value={addressQuery}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="Numéro, rue, ville..."
              maxLength={300}
            />
            {addressLoading && (
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Recherche...</p>
            )}
            {addressUnavailable && (
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Suggestions indisponibles, vous pouvez saisir l&apos;adresse manuellement.
              </p>
            )}
            {addressSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                zIndex: 10,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginTop: '4px',
                width: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>
                {addressSuggestions.map((s, i) => (
                  <button
                    key={`${s.label}-${i}`}
                    type="button"
                    onClick={() => handleSelectAddress(s)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      fontSize: '13px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: i < addressSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer',
                      color: '#111827',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Complément de demande</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Précisions complémentaires (détails, contraintes, disponibilités...)"
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              maxLength={4000}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Photos</label>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
              Vous pourrez aussi transmettre des photos si l&apos;entreprise vous les demande.
            </p>
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
            {submitting ? 'Envoi...' : 'Envoyer mes informations'}
          </button>
        </div>
      </div>
    </div>
  );
}
