import type { ReactNode, CSSProperties } from 'react';

interface AdminTableProps {
  children: ReactNode;
  minWidth?: string | number;
  emptyState?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function AdminTable({
  children,
  minWidth,
  emptyState,
  className,
  style,
}: AdminTableProps) {
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
      {emptyState ? (
        emptyState
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth }}>
            {children}
          </table>
        </div>
      )}
    </div>
  );
}
