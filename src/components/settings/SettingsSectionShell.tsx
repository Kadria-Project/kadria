'use client';

import type { ReactNode } from 'react';
import { ReadOnlyNotice, type ReadOnlyReason } from '@/src/components/settings/ReadOnlyNotice';

type SettingsSectionShellProps = {
  title: string;
  description?: string;
  /** Quand vrai, affiche un ReadOnlyNotice au-dessus du contenu. */
  readOnly?: boolean;
  readOnlyReason?: ReadOnlyReason;
  readOnlyMessage?: string;
  children: ReactNode;
};

/**
 * Wrapper standard pour une section de `/parametres` : titre, description
 * optionnelle, et bandeau lecture-seule optionnel. Ne gere pas lui-meme la
 * logique de permission — combiner avec `<PermissionGate>` pour
 * masquer/afficher, et passer `readOnly` ici pour l'etat "visible mais non
 * editable".
 */
export function SettingsSectionShell({
  title,
  description,
  readOnly = false,
  readOnlyReason,
  readOnlyMessage,
  children,
}: SettingsSectionShellProps) {
  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>{title}</h2>
      {description && (
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-3)' }}>{description}</p>
      )}
      {readOnly && <ReadOnlyNotice reason={readOnlyReason} message={readOnlyMessage} />}
      <fieldset
        disabled={readOnly}
        style={{ border: 'none', margin: 0, padding: 0, opacity: readOnly ? 0.85 : 1 }}
      >
        {children}
      </fieldset>
    </div>
  );
}
