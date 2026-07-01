import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react';

export type AdminButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type AdminButtonSize = 'small' | 'medium' | 'large';

const VARIANT_STYLES: Record<AdminButtonVariant, CSSProperties> = {
  primary: {
    background: 'linear-gradient(180deg, #34d399, #22c55e)',
    color: '#04130a',
    border: 'none',
    fontWeight: 700,
    boxShadow: '0 10px 24px rgba(34,197,94,0.22)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-1)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontWeight: 600,
  },
  danger: {
    background: 'rgba(127,29,29,0.45)',
    color: '#fecaca',
    border: '1px solid rgba(248,113,113,0.22)',
    fontWeight: 700,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-2)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontWeight: 600,
  },
};

const SIZE_STYLES: Record<AdminButtonSize, CSSProperties> = {
  small: { padding: '6px 12px', fontSize: '12px', borderRadius: '8px' },
  medium: { padding: '10px 16px', fontSize: '13px', borderRadius: '10px' },
  large: { padding: '12px 32px', fontSize: '14px', borderRadius: '12px' },
};

interface AdminButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children: ReactNode;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  loading?: boolean;
  loadingLabel?: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
}

export default function AdminButton({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  loadingLabel,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: AdminButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      disabled={isDisabled}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        cursor: 'pointer',
        width: fullWidth ? '100%' : undefined,
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease, color 160ms ease',
        ...style,
      }}
      {...rest}
    >
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
