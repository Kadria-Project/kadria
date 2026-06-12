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
      ? 'border border-zinc-700 text-white bg-transparent hover:bg-zinc-800'
      : 'border border-transparent bg-green-500 text-black font-semibold hover:bg-green-400';

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${variantClass} ${className}`}
      {...props}
    />
  );
}