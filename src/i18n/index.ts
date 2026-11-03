import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ar } from './ar';
import { en } from './en';

export type AppLanguage = 'ar' | 'en';
const storageKey = 'maintenance-portal-language';
const saved = localStorage.getItem(storageKey);
const initialLanguage: AppLanguage = saved === 'en' ? 'en' : 'ar';

void i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLanguage,
  fallbackLng: 'ar',
  supportedLngs: ['ar', 'en'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

function applyLanguage(language: string) {
  const locale: AppLanguage = language === 'en' ? 'en' : 'ar';
  localStorage.setItem(storageKey, locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.title = i18n.t('app.title');
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('app.description'));
}

i18n.on('languageChanged', applyLanguage);
applyLanguage(initialLanguage);

export default i18n;
