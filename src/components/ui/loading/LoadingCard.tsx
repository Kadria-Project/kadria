import type { CSSProperties } from 'react';
import LoadingSkeleton, { LoadingStyles } from './LoadingSkeleton';

interface LoadingCardProps {
  lines?: number;
  style?: CSSProperties;
  className?: string;
}

export default function LoadingCard({ lines = 3, style, className }: LoadingCardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        ...style,
      }}
    >
      <LoadingStyles />
      <LoadingSkeleton width="40%" height="16px" />
      {Array.from({ length: lines }).map((_, i) => (
        <LoadingSkeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height="12px" />
      ))}
    </div>
  );
}
