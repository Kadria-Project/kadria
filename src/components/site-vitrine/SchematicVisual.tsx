import type { Realisation } from '@/src/lib/site-vitrine/types'

/**
 * Placeholder éditorial pour les photos de chantier : un dessin schématique
 * façon plan électrique (traits fins, nœuds, repères) propre à chaque type
 * de réalisation. Sur un vrai site client, ce composant est remplacé par la
 * photo du chantier (voir docs/SITE_VITRINE_MEDIAS.md).
 */

type Variant = Realisation['visual'] | 'hero'

const STROKE = 'rgba(246,245,241,0.55)'
const STROKE_SOFT = 'rgba(246,245,241,0.22)'
const NODE = 'var(--sv-accent)'

function Drawing({ variant }: { variant: Variant }) {
  const common = {
    fill: 'none',
    stroke: STROKE,
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (variant) {
    case 'tableau':
    case 'normes':
      return (
        <g {...common}>
          <rect x="60" y="28" width="80" height="104" rx="4" />
          <line x1="60" y1="54" x2="140" y2="54" stroke={STROKE_SOFT} />
          <line x1="60" y1="80" x2="140" y2="80" stroke={STROKE_SOFT} />
          <line x1="60" y1="106" x2="140" y2="106" stroke={STROKE_SOFT} />
          {[74, 90, 106, 122].map((x) => (
            <rect key={`r1-${x}`} x={x} y="60" width="10" height="14" rx="2" />
          ))}
          {[74, 90, 106, 122].map((x) => (
            <rect key={`r2-${x}`} x={x} y="86" width="10" height="14" rx="2" />
          ))}
          <line x1="100" y1="28" x2="100" y2="10" />
          <circle cx="100" cy="10" r="3" fill={NODE} stroke="none" />
          <line x1="100" y1="132" x2="100" y2="150" />
        </g>
      )
    case 'eclairage-int':
      return (
        <g {...common}>
          <line x1="20" y1="36" x2="180" y2="36" stroke={STROKE_SOFT} />
          {[55, 100, 145].map((x) => (
            <g key={x}>
              <circle cx={x} cy="52" r="9" />
              <line x1={x - 6.5} y1="45.5" x2={x + 6.5} y2="58.5" />
              <line x1={x + 6.5} y1="45.5" x2={x - 6.5} y2="58.5" />
              <line x1={x} y1="36" x2={x} y2="43" stroke={STROKE_SOFT} />
              <line x1={x - 14} y1="78" x2={x + 14} y2="78" stroke={STROKE_SOFT} strokeDasharray="2 5" />
            </g>
          ))}
          <line x1="30" y1="120" x2="170" y2="120" />
          <circle cx="30" cy="120" r="3" fill={NODE} stroke="none" />
          <circle cx="170" cy="120" r="3" fill={NODE} stroke="none" />
        </g>
      )
    case 'eclairage-ext':
      return (
        <g {...common}>
          <line x1="14" y1="126" x2="186" y2="126" />
          {[46, 100, 154].map((x) => (
            <g key={x}>
              <line x1={x} y1="126" x2={x} y2="84" />
              <circle cx={x} cy="76" r="8" />
              <path d={`M ${x - 12} 96 L ${x + 12} 96`} stroke={STROKE_SOFT} strokeDasharray="2 5" />
            </g>
          ))}
          <path d="M 20 140 H 180" stroke={STROKE_SOFT} strokeDasharray="4 6" />
          <circle cx="20" cy="140" r="3" fill={NODE} stroke="none" />
        </g>
      )
    case 'borne':
    case 'hero':
      return (
        <g {...common}>
          <rect x="118" y="44" width="40" height="76" rx="8" />
          <rect x="128" y="56" width="20" height="14" rx="2" stroke={STROKE_SOFT} />
          <circle cx="138" cy="94" r="7" />
          <path d="M 138 90 l -3 5 h 6 l -3 5" strokeWidth="1.2" />
          <line x1="138" y1="120" x2="138" y2="140" />
          <path d="M 138 140 H 44" />
          <path d="M 44 140 V 78" />
          <rect x="28" y="42" width="32" height="36" rx="3" />
          <line x1="34" y1="52" x2="54" y2="52" stroke={STROKE_SOFT} />
          <line x1="34" y1="60" x2="54" y2="60" stroke={STROKE_SOFT} />
          <circle cx="44" cy="140" r="3" fill={NODE} stroke="none" />
          <circle cx="138" cy="140" r="3" fill={NODE} stroke="none" />
          <text x="88" y="134" fill={STROKE_SOFT} stroke="none" fontSize="8" fontFamily="var(--font-geist-mono), monospace">
            10&#8202;mm&#178;
          </text>
        </g>
      )
    case 'renovation':
      return (
        <g {...common}>
          <path d="M 30 70 L 100 26 L 170 70" />
          <path d="M 44 70 V 130 H 156 V 70" stroke={STROKE_SOFT} />
          <rect x="66" y="92" width="22" height="38" rx="2" stroke={STROKE_SOFT} />
          <rect x="112" y="92" width="26" height="22" rx="2" stroke={STROKE_SOFT} />
          <path d="M 44 118 H 156" strokeDasharray="2 5" />
          <circle cx="44" cy="118" r="3" fill={NODE} stroke="none" />
          <circle cx="156" cy="118" r="3" fill={NODE} stroke="none" />
        </g>
      )
  }
}

export function SchematicVisual({
  variant,
  label,
  className = '',
}: {
  variant: Variant
  label?: string
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden ${className}`}
      style={{
        background: 'var(--sv-night)',
        backgroundImage:
          'linear-gradient(var(--sv-line-dark) 1px, transparent 1px), linear-gradient(90deg, var(--sv-line-dark) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <svg viewBox="0 0 200 160" className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="presentation">
        <Drawing variant={variant} />
      </svg>
      {label ? (
        <span
          className="absolute bottom-2.5 left-3 text-[10px] uppercase tracking-[0.14em]"
          style={{ color: 'rgba(246,245,241,0.5)', fontFamily: 'var(--font-geist-mono), monospace' }}
        >
          {label}
        </span>
      ) : null}
    </div>
  )
}
