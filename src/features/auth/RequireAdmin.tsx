import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function RequireAdmin() {
  const { t } = useTranslation();
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="loading" role="status">
        {t('shell.checking')}
      </div>
    );
  return isAdmin ? (
    <Outlet />
  ) : (
    <Navigate
      to="/access-denied"
      replace
      state={{
        from: location.pathname + location.search,
        legacyEquipmentLink: location.pathname.startsWith('/equipment/'),
      }}
    />
  );
}
