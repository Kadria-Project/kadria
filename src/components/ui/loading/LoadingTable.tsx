import type { CSSProperties } from 'react';
import LoadingSkeleton, { LoadingStyles } from './LoadingSkeleton';

interface LoadingTableProps {
  columns?: number;
  columnWidths?: string[];
  rows?: number;
  style?: CSSProperties;
  className?: string;
}

export default function LoadingTable({
  columns = 4,
  columnWidths,
  rows = 5,
  style,
  className,
}: LoadingTableProps) {
  const widths = columnWidths && columnWidths.length === columns
    ? columnWidths
    : Array.from({ length: columns }, (_, i) => (i === 0 ? '28%' : `${Math.floor(72 / (columns - 1 || 1))}%`));

  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
        ...style,
      }}
    >
      <LoadingStyles />
      <div style={{ display: 'flex', gap: '20px', padding: '12px 20px', background: 'var(--border)' }}>
        {widths.map((w, i) => (
          <LoadingSkeleton key={i} width={w} height="10px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'flex',
            gap: '20px',
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {widths.map((w, i) => (
            <LoadingSkeleton key={i} width={w} height="12px" />
          ))}
        </div>
      ))}
    </div>
  );
}
