import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LoginModal } from './LoginModal';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';
import type { HSERole } from './hseMembership';

export function AccessDeniedPage() {
  const { t } = useTranslation();
  const { user, isAdmin, hseRole, hseInactive, hseError, loading, error, signOut } = useAuth();
  const location = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const routeState = location.state as {
    from?: string;
    legacyEquipmentLink?: boolean;
    department?: 'hse';
    allowedRoles?: readonly HSERole[];
  } | null;
  const from = routeState?.from;
  const legacyQrForVisitor = Boolean(routeState?.legacyEquipmentLink && !user);
  const safeFrom = from?.startsWith('/') && !from.startsWith('//') ? from : null;
  const hseDestination =
    safeFrom?.startsWith('/hse') &&
    hseRole &&
    (!routeState?.allowedRoles || routeState.allowedRoles.includes(hseRole));
  const maintenanceDestination =
    safeFrom === '/' ||
    safeFrom?.startsWith('/dashboard') ||
    safeFrom?.startsWith('/equipment') ||
    safeFrom?.startsWith('/settings');
  if (loading)
    return (
      <div className="loading" role="status">
        {t('shell.checking')}
      </div>
    );
  if (hseDestination) return <Navigate to={safeFrom ?? '/hse'} replace />;
  if (maintenanceDestination && isAdmin) return <Navigate to={safeFrom ?? '/'} replace />;
  if (!safeFrom && isAdmin) return <Navigate to="/" replace />;
  if ((!safeFrom || safeFrom === '/') && hseRole) return <Navigate to="/hse" replace />;
  const hseAccess = routeState?.department === 'hse';
  const descriptionKey = !user
    ? hseAccess
      ? 'access.hseLoginRequired'
      : 'access.description'
    : hseAccess && hseError
      ? 'access.verificationFailed'
      : hseAccess && hseInactive
        ? 'access.inactive'
        : hseAccess &&
            hseRole &&
            routeState?.allowedRoles &&
            !routeState.allowedRoles.includes(hseRole)
          ? 'access.insufficient'
          : error && !hseAccess
            ? 'access.verificationFailed'
            : hseAccess
              ? 'access.hseUnauthorized'
              : 'access.unauthorized';
  return (
    <main className="access-page">
      <div className="access-language">
        <LanguageSwitcher />
      </div>
      <div className="access-card">
        <span className="access-icon" aria-hidden="true">
          ⌁
        </span>
        <span className="eyebrow">{t(hseAccess ? 'hse.title' : 'shell.department')}</span>
        <h1>
          {t(
            legacyQrForVisitor
              ? 'access.legacyQrTitle'
              : hseAccess
                ? 'access.hseTitle'
                : 'access.title',
          )}
        </h1>
        <p>{t(legacyQrForVisitor ? 'access.legacyQrDescription' : descriptionKey)}</p>
        {legacyQrForVisitor ? null : user ? (
          <>
            {hseRole && !hseAccess && <Link to="/hse">{t('hse.title')}</Link>}
            {isAdmin && hseAccess && <Link to="/dashboard">{t('hse.maintenance')}</Link>}
            <button className="outline-button" onClick={() => void signOut()}>
              {t('shell.logout')}
            </button>
          </>
        ) : (
          <button className="primary-button" onClick={() => setLoginOpen(true)}>
            {t('shell.login')}
          </button>
        )}
      </div>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </main>
  );
}
