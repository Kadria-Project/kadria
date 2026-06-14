'use client';

import React from 'react';

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-white"
    >
      {children}
    </select>
  );
}

export function SelectTrigger({
  children,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return null;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({
  value,
  children,
  style,
}: {
  value: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <option value={value} style={style}>
      {children}
    </option>
  );
}