import type { CSSProperties } from 'react';

interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  style?: CSSProperties;
  className?: string;
}

export default function LoadingSkeleton({
  width = '100%',
  height = '14px',
  radius = '8px',
  style,
  className,
}: LoadingSkeletonProps) {
  return (
    <div
      className={`kadria-loading-skeleton ${className || ''}`.trim()}
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'var(--border)',
        ...style,
      }}
    />
  );
}

export const KADRIA_LOADING_STYLES = `
  @keyframes kadria-loading-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
  .kadria-loading-skeleton { animation: kadria-loading-pulse 1.3s ease-in-out infinite; }
`;

export function LoadingStyles() {
  return <style>{KADRIA_LOADING_STYLES}</style>;
}
