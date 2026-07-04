'use client';

import type { ArtisanNotification, ArtisanNotificationPriority } from '@/src/lib/notifications';

interface NotificationItemProps {
  notification: ArtisanNotification;
  onOpen: (notification: ArtisanNotification) => void;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'hier';
  if (diffD < 7) return `il y a ${diffD} j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const PRIORITY_COLOR: Record<ArtisanNotificationPriority, string> = {
  high: '#ef4444',
  medium: 'var(--accent)',
  low: 'var(--text-3)',
};

export default function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const isUnread = notification.status === 'unread';
  const dotColor = PRIORITY_COLOR[notification.priority] || 'var(--accent)';

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        background: isUnread ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        minHeight: 44,
      }}
    >
      <span
        aria-hidden
        style={{
          marginTop: 6,
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          background: isUnread ? dotColor : 'transparent',
          border: isUnread ? 'none' : '1px solid var(--border)',
        }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 13.5,
            fontWeight: isUnread ? 700 : 600,
            color: 'var(--text-1)',
          }}
        >
          {notification.title}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 2,
            fontSize: 12.5,
            color: 'var(--text-2)',
            lineHeight: 1.4,
          }}
        >
          {notification.message}
        </span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--text-3)' }}>
          {relativeTime(notification.createdAt)}
        </span>
      </span>
    </button>
  );
}
