import type { ReactNode, CSSProperties } from 'react';

export type AdminCardPadding = 'sm' | 'md' | 'lg';
export type AdminCardRadius = 'sm' | 'md';

const PADDING_VALUES: Record<AdminCardPadding, string> = {
  sm: '16px',
  md: '20px',
  lg: '28px',
};

const RADIUS_VALUES: Record<AdminCardRadius, string> = {
  sm: '12px',
  md: '16px',
};

interface AdminCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  padding?: AdminCardPadding;
  radius?: AdminCardRadius;
  style?: CSSProperties;
}

export default function AdminCard({
  children,
  title,
  subtitle,
  actions,
  className,
  padding = 'md',
  radius = 'sm',
  style,
}: AdminCardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: RADIUS_VALUES[radius],
        padding: PADDING_VALUES[padding],
        ...style,
      }}
    >
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            {title && <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>{title}</p>}
            {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 0' }}>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
