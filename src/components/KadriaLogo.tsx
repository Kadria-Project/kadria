import Link from 'next/link';

type LogoSize = 'sm' | 'md' | 'lg';
type LogoTheme = 'dark' | 'light';

const SIZE_MAP: Record<LogoSize, { fontSize: number; barWidth: number; barHeight: number; dotSize: number }> = {
  sm: { fontSize: 18, barWidth: 14, barHeight: 2, dotSize: 6 },
  md: { fontSize: 28, barWidth: 22, barHeight: 3, dotSize: 8 },
  lg: { fontSize: 48, barWidth: 36, barHeight: 3, dotSize: 12 },
};

const GREEN = '#22c55e';

/**
 * Kadria wordmark — "KADRIA" with a green dot replacing the dot of the "i"
 * and a green bar under the final "A".
 */
export function KadriaLogo({
  size = 'md',
  theme = 'dark',
  className = '',
  noLink,
}: {
  size?: LogoSize;
  theme?: LogoTheme;
  className?: string;
  noLink?: boolean;
}) {
  const { fontSize, barWidth, barHeight, dotSize } = SIZE_MAP[size];
  const color = theme === 'light' ? '#09090b' : '#f4f4f5';

  const content = (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
        fontWeight: 900,
        letterSpacing: '-0.05em',
        textTransform: 'uppercase',
        color,
        fontSize,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        paddingBottom: fontSize * 0.3,
      }}
    >
      <span>KADR</span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        I
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -fontSize * 0.32,
            left: '50%',
            transform: 'translateX(-50%)',
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: GREEN,
          }}
        />
      </span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        A
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: -fontSize * 0.22,
            left: '50%',
            transform: 'translateX(-50%)',
            width: barWidth,
            height: barHeight,
            borderRadius: 2,
            background: GREEN,
          }}
        />
      </span>
    </span>
  );

  if (noLink) return content;

  return (
    <Link href="/" style={{ display: 'inline-flex', textDecoration: 'none' }} className="hover:opacity-80 transition-opacity">
      {content}
    </Link>
  );
}

export const KadriaLogoImg = KadriaLogo;

export default KadriaLogo;
