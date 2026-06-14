'use client';

import { useEffect } from 'react';

export function DemoToast({ show, onClose }: { show: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!show) return;

    const timer = setTimeout(onClose, 5000);

    return () => clearTimeout(timer);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      style={{
        background: '#18181b',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: '12px',
        padding: '16px 20px',
        maxWidth: '320px',
      }}
    >
      <p style={{ color: 'white', fontWeight: 700, fontSize: '14px', margin: '0 0 6px' }}>
        🔒 Fonctionnalité réservée aux membres
      </p>
      <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
        Créez votre compte gratuit pour accéder à toutes les fonctionnalités.
      </p>
      <a
        href="/register"
        style={{
          display: 'block',
          background: '#22c55e',
          color: '#09090b',
          borderRadius: '8px',
          padding: '8px 0',
          fontSize: '13px',
          fontWeight: 600,
          width: '100%',
          marginTop: '8px',
          textAlign: 'center',
          textDecoration: 'none',
        }}
      >
        Commencer gratuitement →
      </a>
    </div>
  );
}
