import React from 'react';

export function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 ${className}`}
      {...props}
    />
  );
}