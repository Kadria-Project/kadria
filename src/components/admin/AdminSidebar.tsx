'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Mail,
  Menu,
  Users,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Vue d'ensemble", href: '/admin', icon: LayoutDashboard },
  { label: 'Artisans', href: '/admin/clients', icon: Users },
  { label: 'Emails', href: '/admin/emails', icon: Mail },
];

export default function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: NavItem): boolean => {
    if (item.href === '/admin') {
      return pathname === '/admin';
    }
    if (item.href.includes('?filter=')) {
      const [basePath, query] = item.href.split('?');
      const filterValue = query.replace('filter=', '');
      return pathname === basePath && searchParams.get('filter') === filterValue;
    }
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Ouvrir le menu admin"
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 60,
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '8px',
          width: '40px',
          height: '40px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
        className="admin-burger"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="admin-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 45,
          }}
        />
      )}

      <aside
        className={`admin-sidebar ${mobileOpen ? 'admin-sidebar-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '240px',
          height: '100vh',
          background: '#18181b',
          borderRight: '1px solid #27272a',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 200ms ease',
        }}
      >
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #27272a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px' }}>
              KA<span style={{ color: '#22c55e' }}>DRIA</span>
            </span>
          </div>
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(220,38,38,0.1)',
              color: '#dc2626',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            ADMIN
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 150ms, color 150ms',
                  background: active ? 'rgba(34,197,94,0.08)' : 'transparent',
                  color: active ? '#22c55e' : '#a1a1aa',
                  borderLeft: active ? '2px solid #22c55e' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = '#27272a';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#a1a1aa';
                  }
                }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '12px', color: '#71717a', margin: 0, wordBreak: 'break-all' }}>{adminEmail}</p>
          <Link
            href="/"
            style={{ fontSize: '12px', color: '#a1a1aa', textDecoration: 'none' }}
          >
            ← Retour au site
          </Link>
        </div>
      </aside>

      <style>{`
        @media (max-width: 767px) {
          .admin-burger { display: flex !important; }
          .admin-sidebar { transform: translateX(-100%); }
          .admin-sidebar-open { transform: translateX(0); }
        }
        @media (min-width: 768px) {
          .admin-overlay { display: none; }
        }
      `}</style>
    </>
  );
}
