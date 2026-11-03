import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { env } from '../config/env';
import { useAuth } from '../features/auth/AuthProvider';
import { LoginModal } from '../features/auth/LoginModal';
import { useToast } from '../shared/ui/ToastProvider';
import { LanguageSwitcher } from '../shared/ui/LanguageSwitcher';

export function AppShell() {
  const { t } = useTranslation();
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, isAdmin, loading, error, signOut } = useAuth();
  const toast = useToast();
  const detail = useLocation().pathname.startsWith('/equipment/');
  const teamsPage = useLocation().pathname === '/teams';
  const settingsPage = useLocation().pathname === '/settings';

  async function logout() {
    try {
      await signOut();
      toast.show(t('shell.loggedOut'));
    } catch (cause) {
      toast.show(cause instanceof Error ? cause.message : t('shell.logoutFailed'));
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>{t('shell.factory')}</strong>
            <small>{t('shell.department')}</small>
          </div>
        </Link>
        <div className="side-label">{t('shell.menu')}</div>
        <nav aria-label={t('shell.menu')}>
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            ▦ <span>{t('shell.dashboard')}</span>
          </NavLink>
          <Link className="nav-item" to="/?type=machine">
            ▤ <span>{t('shell.machines')}</span>
          </Link>
          <Link className="nav-item" to="/?type=crane">
            ♜ <span>{t('shell.cranes')}</span>
          </Link>
          <NavLink to="/teams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            ♧ <span>{t('shell.teams')}</span>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              ⚙ <span>{t('shell.settings')}</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">▣</span>
            <strong>{t('shell.equipmentProfile')}</strong>
            <p>{t('shell.qrNote')}</p>
          </div>
          <div className="side-foot">
            MAINTENANCE SYSTEM <span>2026</span>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark">F</div>
            <strong>{t('shell.department')}</strong>
          </div>
          <div className="breadcrumb">
            {t('shell.department')} <span>/</span>{' '}
            {detail
              ? t('shell.equipmentDetails')
              : teamsPage
                ? t('shell.teams')
                : settingsPage
                  ? t('shell.settings')
                  : t('shell.dashboard')}
          </div>
          <div className="top-actions">
            <LanguageSwitcher />
            {env.isDemo && <span className="demo-pill">{t('shell.localDemo')}</span>}
            {loading ? (
              <span className="account-chip">{t('shell.checking')}</span>
            ) : isAdmin ? (
              <>
                <span className="account-chip">{user?.email || t('shell.demoAdmin')}</span>
                {!env.isDemo && (
                  <button className="text-button" onClick={logout}>
                    {t('shell.logout')}
                  </button>
                )}
              </>
            ) : user ? (
              <>
                <span className="account-chip">{t('shell.unauthorized')}</span>
                <button className="text-button" onClick={logout}>
                  {t('shell.logout')}
                </button>
              </>
            ) : (
              <button className="login-button" onClick={() => setLoginOpen(true)}>
                {t('shell.login')}
              </button>
            )}
          </div>
        </header>
        <nav className="mobile-nav" aria-label={t('shell.menu')}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            {t('shell.mobileEquipment')}
          </NavLink>
          <NavLink to="/teams" className={({ isActive }) => (isActive ? 'active' : '')}>
            {t('shell.teams')}
          </NavLink>
          {isAdmin && (
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
              {t('shell.settings')}
            </NavLink>
          )}
        </nav>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              {t('shell.authCheckFailed')}: {error}
            </div>
          )}
          <Outlet />
        </main>
      </div>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  );
}
