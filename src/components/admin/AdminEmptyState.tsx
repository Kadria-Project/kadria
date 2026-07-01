import type { ReactNode } from 'react';

interface AdminEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export default function AdminEmptyState({ icon, title, description, action, compact = false }: AdminEmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: compact ? '20px 12px' : '40px 20px',
        maxWidth: compact ? '100%' : '420px',
        margin: '0 auto',
      }}
    >
      {icon && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '44px',
            height: '44px',
            margin: '0 auto 12px',
            color: 'var(--text-2)',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {icon}
        </div>
      )}
      <p style={{ fontSize: compact ? '13px' : '15px', color: 'var(--text-2)', margin: 0, fontWeight: 700 }}>{title}</p>
      {description && (
        <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-3)', margin: '8px 0 0' }}>{description}</p>
      )}
      {action && <div style={{ marginTop: '12px' }}>{action}</div>}
    </div>
  );
}
