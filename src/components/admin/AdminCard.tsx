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
        background: 'linear-gradient(180deg, rgba(24,24,27,0.96), rgba(9,9,11,0.98))',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: RADIUS_VALUES[radius],
        padding: PADDING_VALUES[padding],
        boxShadow: '0 18px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        ...style,
      }}
    >
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
          <div>
            {title && <p style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em', margin: 0 }}>{title}</p>}
            {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
