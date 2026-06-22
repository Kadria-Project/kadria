import Link from 'next/link';

type LogoSize = 'sm' | 'md' | 'lg';
type LogoTheme = 'dark' | 'light';

const SIZE_MAP: Record<LogoSize, { fontSize: number }> = {
  sm: { fontSize: 18 },
  md: { fontSize: 28 },
  lg: { fontSize: 48 },
};

const GREEN = '#22c55e';

const MARK_PATH =
  'M26 14 L26 86 L18 94 M26 50 L70 14 M26 50 L48 68 L58 78 L78 50 L78 86 L64 94';

function KadriaMark({ size, outline }: { size: number; outline: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden style={{ flexShrink: 0 }}>
      <g fill="none" strokeLinecap="square" strokeLinejoin="miter">
        <path d={MARK_PATH} stroke={outline} strokeWidth={14} />
        <path d={MARK_PATH} stroke={GREEN} strokeWidth={9} />
      </g>
    </svg>
  );
}

/**
 * Kadria wordmark — a green "K" monogram (with an integrated checkmark)
 * followed by "ADRIA".
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
  const { fontSize } = SIZE_MAP[size];
  const color = theme === 'light' ? '#09090b' : '#f4f4f5';
  const markSize = fontSize * 0.9;

  const content = (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: fontSize * 0.08,
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
        fontWeight: 900,
        letterSpacing: '-0.05em',
        textTransform: 'uppercase',
        color,
        fontSize,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <KadriaMark size={markSize} outline={color} />
      <span>ADRIA</span>
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
