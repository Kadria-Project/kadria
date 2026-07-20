'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Coins,
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
  { label: 'Coûts & marge', href: '/admin/marges', icon: Coins },
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
          background: 'rgba(24,24,27,0.94)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          width: '40px',
          height: '40px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
          backdropFilter: 'blur(12px)',
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
          background: 'linear-gradient(180deg, rgba(18,18,21,0.98), rgba(9,9,11,0.99))',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 200ms ease',
          boxShadow: '24px 0 60px rgba(0,0,0,0.28)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div style={{ padding: '24px 18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px' }}>
              KA<span style={{ color: '#22c55e' }}>DRIA</span>
            </span>
          </div>
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(34,197,94,0.08)',
              color: '#86efac',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '999px',
              padding: '4px 10px',
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
                  background: active ? 'linear-gradient(90deg, rgba(34,197,94,0.14), rgba(34,197,94,0.04))' : 'transparent',
                  color: active ? '#dcfce7' : '#a1a1aa',
                  border: active ? '1px solid rgba(34,197,94,0.18)' : '1px solid transparent',
                  boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.02)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
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

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
