import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function Field({ label, value }: { label: string; value: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <span>{label}</span>
      <strong dir="auto">
        {value || <span className="empty-value">{t('common.notRecorded')}</span>}
      </strong>
    </div>
  );
}
