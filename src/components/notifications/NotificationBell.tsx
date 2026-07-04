'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import type { ArtisanNotification } from '@/src/lib/notifications';
import NotificationBadge from './NotificationBadge';
import NotificationCenter from './NotificationCenter';

interface NotificationBellProps {
  /** 'desktop' ouvre un dropdown ancré au bouton, 'mobile' un bottom sheet plein écran. */
  variant?: 'desktop' | 'mobile';
  className?: string;
}

const POLL_INTERVAL_MS = 60_000;

export default function NotificationBell({ variant = 'desktop', className }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ArtisanNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch('/api/notifications?limit=25', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(true);
        return;
      }
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setError(true);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);

  useEffect(() => {
    loadInitial();
    // Refresh discret : ne bloque jamais l'UI, ne remplace pas un vrai
    // temps réel (hors scope V1, cf. brief).
    const interval = setInterval(() => {
      load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadInitial, load]);

  useEffect(() => {
    if (variant !== 'desktop' || !open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant, open]);

  const handleToggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) load();
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    // Optimiste : évite tout effet de flash pour un clic rapide répété.
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' as const })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch {
      // Best-effort : un échec silencieux ne doit pas bloquer l'UI, un
      // prochain refresh (poll ou ouverture) resynchronisera l'état réel.
    }
  };

  const handleOpenNotification = async (notification: ArtisanNotification) => {
    if (notification.status === 'unread') {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, status: 'read' as const } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await fetch(`/api/notifications/${notification.id}/read`, { method: 'POST' });
      } catch {
        // Best-effort, cf. handleMarkAllRead.
      }
    }

    setOpen(false);

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }} className={className}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: variant === 'mobile' ? 40 : 36,
          height: variant === 'mobile' ? 40 : 36,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-2)',
          cursor: 'pointer',
        }}
      >
        <Bell className="h-4 w-4" />
        <NotificationBadge count={unreadCount} />
      </button>

      {open && variant === 'desktop' && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 440,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            zIndex: 60,
            overflow: 'hidden',
          }}
        >
          <NotificationCenter
            notifications={notifications}
            loading={loading}
            error={error}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
            onOpenNotification={handleOpenNotification}
          />
        </div>
      )}

      {open && variant === 'mobile' && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: '75vh',
              background: 'var(--bg-elevated)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)' }} />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-3)',
              }}
            >
              <X className="h-4 w-4" />
            </button>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <NotificationCenter
                notifications={notifications}
                loading={loading}
                error={error}
                unreadCount={unreadCount}
                onMarkAllRead={handleMarkAllRead}
                onOpenNotification={handleOpenNotification}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
