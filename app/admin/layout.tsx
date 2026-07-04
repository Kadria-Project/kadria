import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/src/lib/auth-utils';
import AdminSidebar from '@/src/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: 'Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== 'Admin') {
    redirect('/login');
  }

  return (
    <div
      className="admin-root"
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(34,197,94,0.08), transparent 22%), radial-gradient(circle at top right, rgba(16,185,129,0.05), transparent 20%), #09090b',
        color: '#ffffff',
      }}
    >
      <AdminSidebar adminEmail={session.email} />
      <main className="admin-main" style={{ marginLeft: '240px', padding: '32px 32px 40px', minHeight: '100vh' }}>
        <div
          className="admin-page-shell"
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </div>
      </main>
      <style>{`
        @media (max-width: 767px) {
          .admin-main { margin-left: 0 !important; padding: 24px 16px 32px !important; padding-top: 72px !important; }
        }
      `}</style>
    </div>
  );
}
