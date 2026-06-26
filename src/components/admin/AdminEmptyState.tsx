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
        padding: compact ? '20px 0' : '32px 0',
      }}
    >
      {icon && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--text-3)' }}>
          {icon}
        </div>
      )}
      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, fontWeight: 600 }}>{title}</p>
      {description && (
        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '4px 0 0' }}>{description}</p>
      )}
      {action && <div style={{ marginTop: '12px' }}>{action}</div>}
    </div>
  );
}
