import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LoginModal } from './LoginModal';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';

export function AccessDeniedPage() {
  const { t } = useTranslation();
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const routeState = location.state as { from?: string; legacyEquipmentLink?: boolean } | null;
  const from = routeState?.from;
  const legacyQrForVisitor = Boolean(routeState?.legacyEquipmentLink && !user);
  if (loading)
    return (
      <div className="loading" role="status">
        {t('shell.checking')}
      </div>
    );
  if (isAdmin)
    return <Navigate to={from?.startsWith('/') && !from.startsWith('//') ? from : '/'} replace />;
  return (
    <main className="access-page">
      <div className="access-language">
        <LanguageSwitcher />
      </div>
      <div className="access-card">
        <span className="access-icon" aria-hidden="true">
          ⌁
        </span>
        <span className="eyebrow">{t('shell.department')}</span>
        <h1>{t(legacyQrForVisitor ? 'access.legacyQrTitle' : 'access.title')}</h1>
        <p>
          {t(
            legacyQrForVisitor
              ? 'access.legacyQrDescription'
              : user
                ? 'access.unauthorized'
                : 'access.description',
          )}
        </p>
        {legacyQrForVisitor ? null : user ? (
          <button className="outline-button" onClick={() => void signOut()}>
            {t('shell.logout')}
          </button>
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
