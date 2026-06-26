import type { ReactNode, CSSProperties } from 'react';

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '10px 20px',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-3)',
  fontWeight: 700,
};

interface AdminTableProps {
  columns?: string[];
  children: ReactNode;
  minWidth?: string | number;
  emptyState?: ReactNode;
  loading?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function AdminTable({
  columns,
  children,
  minWidth,
  emptyState,
  loading,
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
      {loading ? (
        loading
      ) : emptyState ? (
        emptyState
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth }}>
            {columns && (
              <thead>
                <tr style={{ background: 'var(--border)' }}>
                  {columns.map((col) => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
            )}
            {children}
          </table>
        </div>
      )}
    </div>
  );
}
