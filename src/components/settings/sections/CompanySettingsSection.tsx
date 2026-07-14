'use client';

import { useEffect, useRef, useState } from 'react';
import type { TenantRole } from '@/src/lib/team/types';
import { hasPermission } from '@/src/lib/team/permission-matrix';
import { PermissionGate } from '@/src/components/settings/PermissionGate';
import { SettingsSectionShell } from '@/src/components/settings/SettingsSectionShell';

export type CompanySettingsValues = {
  companyName: string;
  websiteUrl: string;
  googleReviewUrl: string;
  welcomeName: string;
  logoUrl: string;
};

type CompanySettingsSectionProps = {
  role: TenantRole | null;
  values: CompanySettingsValues;
  loading: boolean;
  isMobile: boolean;
  uploading: boolean;
  uploadError: string | null;
  onUploadLogo: (file: File) => Promise<void>;
  onRemoveLogo: () => void;
  onSaved: (values: CompanySettingsValues) => void;
};

function isValidOptionalHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-hover)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: 'var(--text-1)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'system-ui',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '6px',
};

const sectionCard: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '16px',
  minWidth: 0,
};

export function CompanySettingsSection({
  role,
  values,
  loading,
  isMobile,
  uploading,
  uploadError,
  onUploadLogo,
  onRemoveLogo,
  onSaved,
}: CompanySettingsSectionProps) {
  const [local, setLocal] = useState<CompanySettingsValues>(values);
  const seeded = useRef(false);

  useEffect(() => {
    if (loading || seeded.current) return;
    seeded.current = true;
    setLocal(values);
  }, [loading, values]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const canEdit = hasPermission(role ?? 'viewer', 'company.update');

  const handleSave = async () => {
    if (!isValidOptionalHttpUrl(local.googleReviewUrl)) {
      setError("Le lien vers vos avis Google doit etre valide.");
      return;
    }
    if (!isValidOptionalHttpUrl(local.websiteUrl)) {
      setError('Le site web doit etre valide.');
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: local.companyName,
          websiteUrl: local.websiteUrl,
          googleReviewUrl: local.googleReviewUrl,
          welcomeName: local.welcomeName,
          logoUrl: local.logoUrl,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error("Kadria n'a pas pu enregistrer ces modifications.");
      }
      onSaved(local);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kadria n'a pas pu enregistrer ces modifications.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGate role={role} permission="company.read" fallback={null}>
      <SettingsSectionShell
        title="Mon entreprise"
        readOnly={!canEdit}
        readOnlyReason="owner_only"
      >
        <div style={sectionCard}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)' }}>Identite de l'entreprise</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
              <label style={labelStyle}>Nom commercial</label>
              <input
                value={local.companyName}
                onChange={(e) => setLocal((c) => ({ ...c, companyName: e.target.value }))}
                placeholder="Martin Renovation"
                style={inputStyle}
              />
              <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '5px 0 0' }}>
                Nom affiche a vos clients.
              </p>
            </div>
            <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
              <label style={labelStyle}>Site web</label>
              <input
                value={local.websiteUrl}
                onChange={(e) => setLocal((c) => ({ ...c, websiteUrl: e.target.value }))}
                placeholder="https://monsite.fr"
                style={inputStyle}
              />
            </div>
            <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
              <label style={labelStyle}>Lien vers vos avis Google</label>
              <input
                id="field-google-review-url"
                value={local.googleReviewUrl}
                onChange={(e) => setLocal((c) => ({ ...c, googleReviewUrl: e.target.value }))}
                placeholder="https://g.page/r/..."
                style={inputStyle}
              />
              <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '5px 0 0' }}>
                Ajoutez ce lien pour pouvoir demander des avis a vos clients.
              </p>
            </div>
            <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
              <label style={labelStyle}>Nom affiche dans le widget</label>
              <input
                value={local.welcomeName}
                onChange={(e) => setLocal((c) => ({ ...c, welcomeName: e.target.value }))}
                placeholder="Assistant Martin Renovation"
                style={inputStyle}
              />
              <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '5px 0 0' }}>
                C'est le nom visible par vos clients dans le widget.
              </p>
            </div>
            <div style={{ maxWidth: isMobile ? '100%' : '420px' }}>
              <label style={labelStyle}>Logo de l'entreprise</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {local.logoUrl && (
                  <img
                    src={local.logoUrl}
                    alt="Logo entreprise"
                    style={{
                      height: '40px',
                      maxWidth: '120px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-hover)',
                      padding: '4px',
                    }}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <label
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-2)',
                    cursor: uploading ? 'default' : 'pointer',
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  {uploading ? 'Import en cours...' : local.logoUrl ? 'Remplacer le logo' : 'Importer un logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      await onUploadLogo(file);
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {local.logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocal((c) => ({ ...c, logoUrl: '' }));
                      onRemoveLogo();
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: '6px 0 0' }}>
                PNG, JPG ou WEBP, 4 Mo maximum.
              </p>
              {uploadError && !uploading && (
                <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{uploadError}</p>
              )}
            </div>
          </div>

          {canEdit && (
            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: saved ? 'rgba(34,197,94,0.2)' : 'var(--accent)',
                  border: saved ? '1px solid var(--accent)' : 'none',
                  color: saved ? '#4ade80' : 'black',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saved ? 'Modifications enregistrees.' : saving ? 'Enregistrement en cours...' : 'Enregistrer'}
              </button>
              {error && (
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#ef4444' }}>{error}</p>
              )}
            </div>
          )}
        </div>
      </SettingsSectionShell>
    </PermissionGate>
  );
}
