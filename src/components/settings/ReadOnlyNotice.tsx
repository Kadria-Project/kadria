'use client';

export type ReadOnlyReason = 'owner_only' | 'read_only';

const MESSAGES: Record<ReadOnlyReason, string> = {
  owner_only: "Cette partie est reservee au proprietaire de l'entreprise.",
  read_only: 'Vous pouvez consulter cette partie, sans la modifier.',
};

type ReadOnlyNoticeProps = {
  reason?: ReadOnlyReason;
  message?: string;
  style?: React.CSSProperties;
};

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
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        color: '#334155',
        fontSize: '13px',
        margin: '0 0 14px',
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 600, color: '#0f766e' }}>Verrouillé</span>
      <span>{message || MESSAGES[reason]}</span>
    </div>
  );
}
