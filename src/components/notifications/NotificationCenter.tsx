'use client';

import { CheckCheck } from 'lucide-react';
import type { ArtisanNotification } from '@/src/lib/notifications';
import NotificationItem from './NotificationItem';

interface NotificationCenterProps {
  notifications: ArtisanNotification[];
  loading: boolean;
  error: boolean;
  unreadCount: number;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: ArtisanNotification) => void;
}

export default function NotificationCenter({
  notifications,
  loading,
  error,
  unreadCount,
  onMarkAllRead,
  onOpenNotification,
}: NotificationCenterProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 6px',
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 48,
                  borderRadius: 8,
                  marginBottom: 8,
                  background: 'var(--bg-hover)',
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <p style={{ padding: 20, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
            Impossible de charger les notifications.
          </p>
        )}

        {!loading && !error && notifications.length === 0 && (
          <p style={{ padding: 20, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
            Vous n&apos;avez aucune notification pour le moment.
          </p>
        )}

        {!loading && !error && notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onOpen={onOpenNotification} />
        ))}
      </div>
    </div>
  );
}
