import React from 'react';

export function Card({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-1)] shadow-sm ${className}`}
      {...props}
    />
  );
}