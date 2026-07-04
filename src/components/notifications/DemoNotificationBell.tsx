'use client';

// Variante demo de NotificationBell : meme rendu visuel (NotificationBadge +
// NotificationCenter reutilises tels quels), mais donnees et actions
// branchees sur DemoModeContext au lieu d'appels reseau vers
// /api/notifications. Garantit l'alignement 1:1 sans jamais toucher a une
// vraie route/API depuis la demo.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import type { ArtisanNotification } from '@/src/lib/notifications';
import { useDemoMode } from '@/src/contexts/DemoModeContext';
import NotificationBadge from './NotificationBadge';
import NotificationCenter from './NotificationCenter';

interface DemoNotificationBellProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export default function DemoNotificationBell({ variant = 'desktop', className }: DemoNotificationBellProps) {
  const router = useRouter();
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useDemoMode();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const asArtisanNotifications: ArtisanNotification[] = notifications.map((n) => ({
    id: n.id,
    artisanId: 'demo-artisan',
    projectId: n.projectId,
    type: n.type,
    title: n.title,
    message: n.message,
    priority: n.priority,
    status: n.status,
    readAt: n.status === 'read' ? n.createdAt : null,
    actionUrl: n.actionUrl,
    metadata: {},
    createdAt: n.createdAt,
    updatedAt: n.createdAt,
  }));

  const handleOpenNotification = useCallback(
    (notification: ArtisanNotification) => {
      markNotificationRead(notification.id);
      setOpen(false);
      if (notification.actionUrl) {
        router.push(notification.actionUrl);
      }
    },
    [markNotificationRead, router],
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }} className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        <NotificationBadge count={unreadNotificationCount} />
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
            notifications={asArtisanNotifications}
            loading={false}
            error={false}
            unreadCount={unreadNotificationCount}
            onMarkAllRead={markAllNotificationsRead}
            onOpenNotification={handleOpenNotification}
          />
        </div>
      )}

      {open && variant === 'mobile' && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
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
                notifications={asArtisanNotifications}
                loading={false}
                error={false}
                unreadCount={unreadNotificationCount}
                onMarkAllRead={markAllNotificationsRead}
                onOpenNotification={handleOpenNotification}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
