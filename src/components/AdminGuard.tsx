'use client';

import { useAuth } from 'zite-auth-sdk';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.replace('/pro');
    }
  }, [user, router]);

  if (!user || user.role !== 'Admin') return null;
  return <>{children}</>;
}
