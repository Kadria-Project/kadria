import React from 'react';

export function Card({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ${className}`}
      {...props}
    />
  );
}