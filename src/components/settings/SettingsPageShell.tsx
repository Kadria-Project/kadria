'use client';

import type { ReactNode } from 'react';
import { KadriaLogo } from '@/src/components/KadriaLogo';

export type SettingsShellSection = {
  id: string;
  label: string;
  icon: string;
};

export type SettingsShellGroup = {
  label: string;
  items: SettingsShellSection[];
};

export type SettingsSaveState = 'idle' | 'saving' | 'saved' | 'error';

type SettingsPageShellProps = {
  mode: 'production' | 'demo';
  activeSection: string;
  groups: SettingsShellGroup[];
  onSectionChange: (id: string) => void;
  onBack: () => void;
  onSave: () => void;
  saveState: SettingsSaveState;
  title?: string;
  statusMessage?: string | null;
  children: ReactNode;
};

export function SettingsPageShell({
  activeSection,
  children,
  groups,
  mode,
  onBack,
  onSave,
  onSectionChange,
  saveState,
  statusMessage,
  title = 'Reglages',
}: SettingsPageShellProps) {
  const saveLabel =
    saveState === 'saved'
      ? 'Enregistre'
      : saveState === 'saving'
        ? 'Enregistrement...'
        : saveState === 'error'
          ? 'Reessayer'
          : 'Enregistrer';

  return (
    <main
      className="dashboard-shell w-full max-w-full overflow-x-hidden"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text-1)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-3 sm:px-8 sm:py-4"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Retour
          </button>
          <div className="flex min-w-0 items-baseline gap-2">
            <KadriaLogo size="sm" theme="dark" noLink />
            <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '14px' }}>
              - {title}
            </span>
            {mode === 'demo' && (
              <span
                style={{
                  background: 'rgba(34,197,94,0.12)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(34,197,94,0.18)',
                  borderRadius: '999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Demo
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saveState === 'saving'}
          className="shrink-0"
          style={{
            background:
              saveState === 'saved'
                ? 'rgba(34,197,94,0.2)'
                : saveState === 'saving'
                  ? 'var(--bg-hover)'
                  : saveState === 'error'
                    ? 'rgba(239,68,68,0.15)'
                    : 'var(--accent)',
            border: saveState === 'saved' ? '1px solid var(--accent)' : 'none',
            color:
              saveState === 'saved'
                ? '#4ade80'
                : saveState === 'saving'
                  ? 'var(--text-3)'
                  : saveState === 'error'
                    ? '#fca5a5'
                    : 'black',
            fontWeight: 700,
            borderRadius: '10px',
            padding: '10px 20px',
            fontSize: '14px',
            cursor: saveState === 'saving' ? 'default' : 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {saveLabel}
        </button>
      </div>

      {statusMessage && (
        <div className="mx-3 mt-4 sm:mx-8">
          <div
            style={{
              background:
                saveState === 'error'
                  ? 'rgba(220,38,38,0.08)'
                  : 'rgba(34,197,94,0.08)',
              border:
                saveState === 'error'
                  ? '1px solid rgba(220,38,38,0.3)'
                  : '1px solid rgba(34,197,94,0.22)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: saveState === 'error' ? '#fca5a5' : 'var(--text-1)',
              fontSize: '13px',
            }}
          >
            {statusMessage}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 xl:px-10" style={{ alignItems: 'stretch' }}>
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '12px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', minWidth: 'max-content' }}>
            {groups.flatMap((group) => group.items).map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: isActive ? '1px solid rgba(34,197,94,0.35)' : '1px solid var(--border)',
                    background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.02)',
                    color: isActive ? 'var(--accent)' : 'var(--text-2)',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{section.icon}</span>
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 w-full">{children}</div>
      </div>
    </main>
  );
}
