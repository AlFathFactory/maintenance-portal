import { useTranslation } from 'react-i18next';
import type { inspectionProgress } from './inspectionModel';

type Progress = ReturnType<typeof inspectionProgress>;

export function InspectionProgress({
  progress,
  unsaved,
}: {
  progress: Progress;
  unsaved: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section className="inspection-progress" aria-label={t('inspectionUI.progress')}>
      <div className="inspection-progress-head">
        <strong>{t('inspectionUI.progress')}</strong>
        <span>
          {progress.completed} / {progress.total} {t('inspectionUI.completed')}
        </span>
      </div>
      <progress max={progress.total || 1} value={progress.completed}>
        {progress.completed} / {progress.total}
      </progress>
      <div className="inspection-progress-grid">
        <span>
          {t('inspectionUI.unanswered')}: <strong>{progress.unanswered}</strong>
        </span>
        <span>
          OK: <strong>{progress.OK}</strong>
        </span>
        <span className={progress.Faulty > 0 ? 'inspection-faulty-count' : ''}>
          Faulty: <strong>{progress.Faulty}</strong>
        </span>
        <span>
          N/A: <strong>{progress['N/A']}</strong>
        </span>
      </div>
      {unsaved && (
        <p className="inspection-unsaved" role="status">
          {t('inspectionUI.unsaved')}
        </p>
      )}
    </section>
  );
}
