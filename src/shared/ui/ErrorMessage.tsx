import { useTranslation } from 'react-i18next';

const errorKeys = {
  EQUIPMENT_TRANSLATIONS_PARTIAL: 'equipment.translationsPartial',
  EQUIPMENT_NOT_FOUND: 'equipment.notFound',
  TEAM_DEMO_UNAVAILABLE: 'errors.demoUnavailable',
  SUPABASE_UNAVAILABLE: 'errors.supabaseUnavailable',
  STAFF_DELETE_FAILED: 'errors.staffDeleteFailed',
  QR_DEMO_UNAVAILABLE: 'errors.qrDemoUnavailable',
  QR_TOKEN_UNAVAILABLE: 'errors.qrTokenUnavailable',
  QR_RESPONSE_INVALID: 'errors.qrResponseInvalid',
} as const;

export function ErrorMessage({ error, retry }: { error: unknown; retry?(): void }) {
  const { t, i18n } = useTranslation();
  if (!error) return null;
  const raw = error instanceof Error ? error.message : String(error);
  const key = errorKeys[raw as keyof typeof errorKeys];
  const message = key
    ? t(key)
    : /duplicate|23505/i.test(raw)
      ? t('errors.duplicate')
      : /permission|policy|403|42501/i.test(raw)
        ? t('errors.forbidden')
        : /fetch|network/i.test(raw)
          ? t('errors.network')
          : /invalid login credentials/i.test(raw)
            ? t('auth.invalid')
            : i18n.language === 'ar' && !/[\u0600-\u06FF]/.test(raw)
              ? t('errors.generic')
              : raw;
  return (
    <div className="error-banner" role="alert">
      {message}
      {retry && <button onClick={retry}>{t('common.retry')}</button>}
    </div>
  );
}
