import type { CSSProperties } from 'react';
import LoadingSkeleton, { LoadingStyles } from './LoadingSkeleton';

interface LoadingFormProps {
  fields?: number;
  style?: CSSProperties;
  className?: string;
}

export default function LoadingForm({ fields = 5, style, className }: LoadingFormProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        ...style,
      }}
    >
      <LoadingStyles />
      <LoadingSkeleton width="35%" height="18px" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <LoadingSkeleton width="20%" height="10px" />
          <LoadingSkeleton width="100%" height="38px" radius="10px" />
        </div>
      ))}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <LoadingSkeleton width="120px" height="40px" radius="10px" />
        <LoadingSkeleton width="100px" height="40px" radius="10px" />
      </div>
    </div>
  );
}
