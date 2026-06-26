import type { CSSProperties } from 'react';
import LoadingSkeleton, { LoadingStyles } from './LoadingSkeleton';

interface LoadingProjectCardProps {
  count?: number;
  style?: CSSProperties;
  className?: string;
}

function Card() {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <LoadingSkeleton width="55%" height="16px" />
        <LoadingSkeleton width="60px" height="20px" radius="999px" />
      </div>
      <LoadingSkeleton width="100%" height="8px" radius="999px" />
      <div style={{ display: 'flex', gap: '8px' }}>
        <LoadingSkeleton width="80px" height="28px" radius="8px" />
        <LoadingSkeleton width="80px" height="28px" radius="8px" />
      </div>
    </div>
  );
}

export default function LoadingProjectCard({ count = 1, style, className }: LoadingProjectCardProps) {
  if (count === 1) {
    return (
      <div className={className} style={style}>
        <LoadingStyles />
        <Card />
      </div>
    );
  }
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...style }}>
      <LoadingStyles />
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}
