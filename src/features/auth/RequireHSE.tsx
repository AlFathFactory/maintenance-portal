import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { HSERole } from './hseMembership';

export function RequireHSE({ allowedRoles }: { allowedRoles?: readonly HSERole[] }) {
  const { t } = useTranslation();
  const { hseRole, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="loading" role="status">
        {t('access.verifying')}
      </div>
    );
  return hseRole && (!allowedRoles || allowedRoles.includes(hseRole)) ? (
    <Outlet />
  ) : (
    <Navigate
      to="/access-denied"
      replace
      state={{
        from: location.pathname + location.search,
        department: 'hse',
        allowedRoles,
      }}
    />
  );
}
