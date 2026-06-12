import React from 'react';

export function Card({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 text-white shadow-sm ${className}`}
      {...props}
    />
  );
}