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
        background: 'linear-gradient(180deg, rgba(24,24,27,0.96), rgba(9,9,11,0.98))',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 18px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)',
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
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
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
