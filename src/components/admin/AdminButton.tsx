import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react';

export type AdminButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type AdminButtonSize = 'small' | 'medium' | 'large';

const VARIANT_STYLES: Record<AdminButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    fontWeight: 700,
  },
  secondary: {
    background: 'var(--border)',
    color: 'var(--text-1)',
    border: '1px solid var(--border)',
    fontWeight: 600,
  },
  danger: {
    background: 'var(--status-lost)',
    color: 'var(--text-1)',
    border: 'none',
    fontWeight: 700,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-2)',
    border: 'none',
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
        ...style,
      }}
      {...rest}
    >
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
