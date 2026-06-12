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
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-border bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}