'use client';

// Badge de compteur non-lu, réutilisable desktop/mobile. N'affiche rien si
// le compteur est à 0 (jamais de badge vide/à zéro qui traîne).

interface NotificationBadgeProps {
  count: number;
  max?: number;
}

export default function NotificationBadge({ count, max = 9 }: NotificationBadgeProps) {
  if (!count || count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);

  return (
    <span
      aria-label={`${count} notification${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}`}
      style={{
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        padding: '0 4px',
        borderRadius: 999,
        background: '#ef4444',
        color: 'white',
        fontSize: 10,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid var(--bg-elevated)',
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}
