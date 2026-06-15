import { redirect } from 'next/navigation';
import { getSession } from '@/src/lib/auth-utils';
import AdminSidebar from '@/src/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== 'Admin') {
    redirect('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#ffffff' }}>
      <AdminSidebar adminEmail={session.email} />
      <main className="admin-main" style={{ marginLeft: '240px', padding: '32px', minHeight: '100vh' }}>
        {children}
      </main>
      <style>{`
        @media (max-width: 767px) {
          .admin-main { margin-left: 0 !important; padding: 24px 16px 32px !important; padding-top: 72px !important; }
        }
      `}</style>
    </div>
  );
}
