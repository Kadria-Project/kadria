import type { CSSProperties } from 'react';
import LoadingSkeleton, { LoadingStyles } from './LoadingSkeleton';

interface LoadingStatsProps {
  count?: number;
  style?: CSSProperties;
  className?: string;
}

export default function LoadingStats({ count = 4, style, className }: LoadingStatsProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        gap: '16px',
        ...style,
      }}
    >
      <LoadingStyles />
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <LoadingSkeleton width="50%" height="28px" radius="6px" />
          <LoadingSkeleton width="70%" height="12px" />
          <LoadingSkeleton width="45%" height="10px" />
        </div>
      ))}
    </div>
  );
}
