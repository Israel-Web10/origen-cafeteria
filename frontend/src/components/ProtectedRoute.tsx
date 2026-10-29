import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageLoading } from './Loading';
import type { Role } from '../types';

/**
 * Protección de rutas en el NAVEGADOR (solo experiencia de usuario).
 * La seguridad real está en el backend: cada endpoint verifica sesión y rol.
 */
export function ProtectedRoute({ children, roles, staff }: { children: ReactNode; roles?: Role[]; staff?: boolean }) {
  const { user, loading, isStaff } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (staff && !isStaff) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
