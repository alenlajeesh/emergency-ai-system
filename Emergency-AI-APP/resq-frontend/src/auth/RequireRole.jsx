import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { canUseRole, destinationForRole } from './roles';

export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="route-loading">Loading your RESQ workspace…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!canUseRole(user, role)) return <Navigate to={destinationForRole(user.role)} replace />;
  return children;
}
