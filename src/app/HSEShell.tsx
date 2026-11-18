import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { getHSEPage, hsePages } from '../features/hse/navigation';
import { HSEIcon } from '../features/hse/HSEIcon';
import { LanguageSwitcher } from '../shared/ui/LanguageSwitcher';
import { useToast } from '../shared/ui/ToastProvider';

export function HSEShell() {
  const { t } = useTranslation();
  const { user, isAdmin, hseRole, error, signOut } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const currentPage = getHSEPage(location.pathname);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => {
      setCompact(media.matches);
      if (!media.matches) setMenuOpen(false);
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    firstLinkRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function closeMenu() {
    if (!compact) return;
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  async function logout() {
    try {
      await signOut();
      toast.show(t('shell.loggedOut'));
    } catch (cause) {
      toast.show(cause instanceof Error ? cause.message : t('shell.logoutFailed'));
    }
  }

  return (
    <div className="hse-shell">
      {compact && menuOpen && (
        <button
          className="hse-backdrop"
          type="button"
          aria-label={t('hse.closeMenu')}
          onClick={closeMenu}
        />
      )}
      <aside
        id="hse-sidebar"
        className={`hse-sidebar${menuOpen ? ' hse-sidebar-open' : ''}`}
        aria-label={t('hse.navigation')}
        aria-hidden={compact && !menuOpen}
        inert={compact && !menuOpen}
      >
        <Link to="/hse" className="hse-brand" onClick={closeMenu}>
          <span className="hse-brand-mark" aria-hidden="true">
            H
          </span>
          <span>
            <strong>{t('shell.factory')}</strong>
            <small>{t('hse.title')}</small>
          </span>
        </Link>
        <span className="hse-nav-caption">{t('hse.navigation')}</span>
        <nav className="hse-nav" aria-label={t('hse.navigation')}>
          {hsePages
            .filter((page) => !page.engineerOnly || hseRole === 'hse_engineer')
            .map((page, index) => (
              <NavLink
                key={page.id}
                ref={index === 0 ? firstLinkRef : undefined}
                to={page.to}
                end={page.id === 'dashboard'}
                onClick={closeMenu}
                className={({ isActive }) => `hse-nav-link${isActive ? ' active' : ''}`}
              >
                <span className="hse-nav-icon" aria-hidden="true">
                  <HSEIcon name={page.id} />
                </span>
                <span>{t(page.labelKey)}</span>
              </NavLink>
            ))}
        </nav>
        {isAdmin && (
          <div className="hse-department-switch">
            <span>{t('hse.chooseDepartment')}</span>
            <Link to="/dashboard" onClick={closeMenu}>
              {t('hse.maintenance')}
            </Link>
          </div>
        )}
      </aside>
      <div className="hse-workspace" aria-hidden={compact && menuOpen} inert={compact && menuOpen}>
        <header className="hse-topbar">
          <div className="hse-topbar-context">
            <button
              ref={menuButtonRef}
              className="hse-menu-toggle"
              type="button"
              aria-label={t(menuOpen ? 'hse.closeMenu' : 'hse.openMenu')}
              aria-expanded={menuOpen}
              aria-controls="hse-sidebar"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">☰</span>
            </button>
            <div>
              <span className="hse-mobile-brand">{t('hse.title')}</span>
              <nav className="hse-breadcrumb" aria-label={t('hse.breadcrumb')}>
                <span>{t('hse.shortName')}</span>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{t(currentPage?.labelKey ?? 'app.notFound')}</span>
              </nav>
            </div>
          </div>
          <div className="hse-topbar-actions">
            <LanguageSwitcher />
            <span className="hse-account" title={user?.email}>
              {user?.email}
              <small>{t(hseRole === 'hse_engineer' ? 'hse.engineer' : 'hse.supervisor')}</small>
            </span>
            <button className="text-button hse-logout" type="button" onClick={() => void logout()}>
              {t('shell.logout')}
            </button>
          </div>
        </header>
        <main className="hse-main">
          {error && (
            <div className="error-banner" role="alert">
              {t('shell.authCheckFailed')}: {error}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
