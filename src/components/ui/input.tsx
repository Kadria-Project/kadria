import React from 'react';

export function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)] ${className}`}
      {...props}
    />
  );
}