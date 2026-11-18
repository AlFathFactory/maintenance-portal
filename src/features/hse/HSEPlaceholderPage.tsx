import { useTranslation } from 'react-i18next';
import type { HSEPageDefinition } from './navigation';
import { HSEIcon } from './HSEIcon';

export function HSEPlaceholderPage({ page }: { page: HSEPageDefinition }) {
  const { t } = useTranslation();
  return (
    <section className="hse-page" aria-labelledby="hse-page-title">
      <div className="hse-page-heading">
        <span className="hse-page-kicker">{t('hse.title')}</span>
        <h1 id="hse-page-title">{t(page.labelKey)}</h1>
        <p>{t(page.descriptionKey)}</p>
      </div>
      <div className="hse-placeholder" role="status">
        <span className="hse-placeholder-icon" aria-hidden="true">
          <HSEIcon name={page.id} />
        </span>
        <h2>{t('hse.comingSoon')}</h2>
        <p>{t('hse.placeholderDescription')}</p>
      </div>
    </section>
  );
}
