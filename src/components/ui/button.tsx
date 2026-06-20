import React from 'react';

export function Button({
  className = '',
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  size?: string;
}) {
  const variantClass =
    variant === 'outline' || variant === 'secondary' || variant === 'ghost'
      ? 'border border-[var(--border)] text-[var(--text-1)] bg-transparent hover:bg-[var(--bg-hover)]'
      : 'border border-transparent bg-[var(--accent)] text-[#05130d] font-semibold hover:opacity-90';

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${variantClass} ${className}`}
      {...props}
    />
  );
}