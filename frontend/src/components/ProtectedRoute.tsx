import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageLoading } from './Loading';
import type { Role } from '../types';

/**
 * Protege rutas que requieren sesión iniciada, y opcionalmente un rol
 * específico (ej: 'admin'). Si no hay sesión, redirige a /login guardando
 * la ruta original para volver después de autenticarse.
 */
export function ProtectedRoute({ children, role }: { children: ReactNode; role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role && user.role !== role) {
    // Un cliente que intenta entrar a /admin (o viceversa) se redirige a inicio.
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
