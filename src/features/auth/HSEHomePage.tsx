import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';

export function HSEHomePage() {
  const { t } = useTranslation();
  const { hseRole, isAdmin, signOut } = useAuth();
  return (
    <main className="access-page">
      <div className="access-language">
        <LanguageSwitcher />
      </div>
      <div className="access-card">
        <span className="eyebrow">{t('shell.factory')}</span>
        <h1>{t('hse.title')}</h1>
        <p>{t('hse.phaseOne')}</p>
        <p>{t(hseRole === 'hse_engineer' ? 'hse.engineer' : 'hse.supervisor')}</p>
        {isAdmin && <Link to="/dashboard">{t('hse.maintenance')}</Link>}
        <button className="outline-button" onClick={() => void signOut()}>
          {t('shell.logout')}
        </button>
      </div>
    </main>
  );
}
