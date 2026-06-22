import Image from 'next/image';
import Link from 'next/link';

type LogoSize = 'sm' | 'md' | 'lg';
type LogoTheme = 'dark' | 'light';

const HEIGHT_MAP: Record<LogoSize, number> = {
  sm: 22,
  md: 34,
  lg: 56,
};

const LOGO_ASPECT_RATIO = 2508 / 627;

export function KadriaLogo({
  size = 'md',
  className = '',
  noLink,
}: {
  size?: LogoSize;
  theme?: LogoTheme;
  className?: string;
  noLink?: boolean;
}) {
  const height = HEIGHT_MAP[size];
  const width = Math.round(height * LOGO_ASPECT_RATIO);

  const content = (
    <Image
      src="/logo.png"
      alt="Kadria"
      width={width}
      height={height}
      className={className}
      style={{ height, width: 'auto' }}
      priority
    />
  );

  if (noLink) return content;

  return (
    <Link href="/" style={{ display: 'inline-flex' }} className="hover:opacity-80 transition-opacity">
      {content}
    </Link>
  );
}

export const KadriaLogoImg = KadriaLogo;

export default KadriaLogo;
