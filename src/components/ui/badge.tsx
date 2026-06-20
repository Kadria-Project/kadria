import React from 'react';

export function Badge({
  className = '',
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  const variantClass = variant === 'secondary' ? 'bg-[var(--bg-hover)] text-[var(--text-2)]' : '';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClass} ${className}`}
      {...props}
    />
  );
}