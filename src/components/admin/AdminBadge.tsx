export type AdminBadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'premium';

export type AdminBadgeVariant =
  | 'plan'
  | 'status'
  | 'setup'
  | 'health'
  | 'billing'
  | 'usage'
  | 'alert'
  | 'feature';

const TONE_STYLES: Record<AdminBadgeTone, { background: string; color: string }> = {
  success: { background: 'var(--badge-qualified-bg)', color: 'var(--badge-qualified-text)' },
  warning: { background: 'var(--badge-callback-bg)', color: 'var(--badge-callback-text)' },
  danger: { background: 'var(--badge-risk-bg)', color: 'var(--badge-risk-text)' },
  neutral: { background: 'var(--badge-new-bg)', color: 'var(--badge-new-text)' },
  info: { background: 'var(--badge-quote-bg)', color: 'var(--badge-quote-text)' },
  premium: { background: 'var(--badge-progress-bg)', color: 'var(--badge-progress-text)' },
};

interface AdminBadgeProps {
  label: string;
  tone?: AdminBadgeTone;
  variant?: AdminBadgeVariant;
  title?: string;
  size?: 'sm' | 'md';
}

export default function AdminBadge({ label, tone = 'neutral', title, size = 'md' }: AdminBadgeProps) {
  if (!label) {
    return <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>—</span>;
  }
  const palette = TONE_STYLES[tone];
  return (
    <span
      title={title}
      style={{
        background: palette.background,
        color: palette.color,
        borderRadius: '999px',
        padding: size === 'sm' ? '3px 9px' : '4px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
}
