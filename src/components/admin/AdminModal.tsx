import type { ReactNode } from 'react';

export type AdminModalSize = 'sm' | 'md' | 'lg';

const SIZE_WIDTHS: Record<AdminModalSize, string> = {
  sm: '360px',
  md: '440px',
  lg: '480px',
};

interface AdminModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: AdminModalSize;
  danger?: boolean;
}

export default function AdminModal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  size = 'md',
  danger = false,
}: AdminModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: SIZE_WIDTHS[size],
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: description ? '8px' : '16px' }}>
          <p
            style={{
              fontWeight: 700,
              fontSize: '16px',
              margin: 0,
              color: danger ? 'var(--status-lost)' : 'var(--text-1)',
            }}
          >
            {title}
          </p>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {description && (
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 16px' }}>{description}</p>
        )}

        {children}

        {footer && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
