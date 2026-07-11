'use client';

export type ReadOnlyReason = 'owner_only' | 'read_only';

const MESSAGES: Record<ReadOnlyReason, string> = {
  owner_only: 'Modification réservée au propriétaire de l\'entreprise.',
  read_only: 'Vous disposez d\'un accès en lecture seule.',
};

type ReadOnlyNoticeProps = {
  reason?: ReadOnlyReason;
  message?: string;
  style?: React.CSSProperties;
};

/**
 * Bandeau reutilisable affiche a la place (ou au-dessus) d'une section quand
 * le role courant n'a pas la permission requise. Ne code jamais le message en
 * dur ailleurs : toujours passer par ce composant pour garder un vocabulaire
 * coherent (cf. AGENTS.md du lot "gouvernance UI /parametres").
 */
export function ReadOnlyNotice({ reason = 'read_only', message, style }: ReadOnlyNoticeProps) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: 'var(--bg-hover)',
        color: 'var(--text-3)',
        fontSize: '13px',
        margin: '0 0 14px',
        ...style,
      }}
    >
      <span aria-hidden="true">🔒</span>
      <span>{message || MESSAGES[reason]}</span>
    </div>
  );
}
