import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, fetchProfile } = useAuthStore();
  const location = useLocation();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      fetchProfile().catch(() => {
        // profile fetch failed, will redirect to login
      });
    }
  }, [isAuthenticated, fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rock-dark-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-climbing-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-rock-light-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
