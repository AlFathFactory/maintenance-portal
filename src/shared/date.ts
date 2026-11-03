import i18n from '../i18n';

export function formatDate(value: string | null | undefined): string {
  if (!value) return i18n.t('common.noMaintenanceDate');
  return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-GB' : 'ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export function todayLocal(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
