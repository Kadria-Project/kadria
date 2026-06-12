import { useAuth } from 'zite-auth-sdk';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      navigate('/pro', { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role !== 'Admin') return null;
  return <>{children}</>;
}
