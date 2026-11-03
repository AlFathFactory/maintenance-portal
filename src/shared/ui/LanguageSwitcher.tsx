import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <div className="language-switch" role="group" aria-label={t('shell.language')}>
      {(['ar', 'en'] as const).map((language) => (
        <button key={language} type="button" className={i18n.language === language ? 'active' : ''} aria-pressed={i18n.language === language} onClick={() => void i18n.changeLanguage(language)}>{language.toUpperCase()}</button>
      ))}
    </div>
  );
}
