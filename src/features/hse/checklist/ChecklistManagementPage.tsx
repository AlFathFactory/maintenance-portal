import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { ChecklistItem, ChecklistSectionWithItems } from '../../../domain/hse';
import { hseCapabilities } from '../../../services/hseRepository';
import { useAuth } from '../../auth/AuthProvider';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { useHSEChecklist, useHSEChecklistVersions } from '../queries';
import { ChecklistContent } from './ChecklistContent';
import { CheckpointDialog } from './CheckpointDialog';
import { DeleteChecklistDialog, type DeleteTarget } from './DeleteChecklistDialog';
import { SectionDialog } from './SectionDialog';
import { canEditChecklist, checklistError, selectedVersion } from './checklistModel';
import './checklist.css';

type Editor =
  | { kind: 'section'; section?: ChecklistSectionWithItems }
  | { kind: 'item'; section: ChecklistSectionWithItems; item?: ChecklistItem };

export function ChecklistManagementPage() {
  const { t, i18n } = useTranslation();
  const { hseRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const versionsQuery = useHSEChecklistVersions();
  const versions = versionsQuery.data ?? [];
  const number = selectedVersion(versions, params.get('version'));
  const selected = versions.find((version) => version.version === number);
  const published = versions.find((version) => version.state === 'published');
  const checklistQuery = useHSEChecklist(selected?.version ?? 0);
  const checklist = checklistQuery.data;
  const editable = selected ? canEditChecklist(hseRole, selected.state) : false;
  const totalItems =
    checklist?.sections.reduce((total, section) => total + section.items.length, 0) ?? 0;
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
          dateStyle: 'medium',
        }).format(new Date(value))
      : t('checklistUI.noDate');

  return (
    <section className="hse-page checklist-page" aria-labelledby="hse-page-title">
      <div className="hse-page-heading">
        <span className="hse-page-kicker">{t('hse.title')}</span>
        <h1 id="hse-page-title">{t('checklistUI.title')}</h1>
        <p>{t('checklistUI.intro')}</p>
      </div>
      {versionsQuery.isPending && (
        <p className="checklist-state" role="status">
          {t('checklistUI.loading')}
        </p>
      )}
      {versionsQuery.isError && (
        <ErrorMessage
          error={checklistError(versionsQuery.error, t)}
          retry={() => void versionsQuery.refetch()}
        />
      )}
      {versionsQuery.data && versions.length === 0 && (
        <div className="checklist-empty">{t('checklistUI.noVersions')}</div>
      )}
      {versions.length > 0 && (
        <>
          <div className="checklist-version-panel">
            <div>
              <span className="checklist-panel-label">
                {published
                  ? t('checklistUI.publishedCurrent', { version: published.version })
                  : t('checklistUI.noPublished')}
              </span>
              <label className="checklist-version-select">
                {t('checklistUI.selectVersion')}
                <select
                  value={selected?.version ?? ''}
                  onChange={(event) => {
                    setParams({ version: event.target.value });
                    setEditor(null);
                    setDeleting(null);
                  }}
                >
                  <option value="" disabled>
                    {t('checklistUI.selectVersion')}
                  </option>
                  {versions.map((version) => (
                    <option key={version.version} value={version.version}>
                      {t('checklistUI.version')} {version.version} —{' '}
                      {t(`checklistUI.${version.state}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="checklist-version-links" aria-label={t('checklistUI.selectVersion')}>
              {versions.map((version) => (
                <button
                  key={version.version}
                  type="button"
                  className={selected?.version === version.version ? 'selected' : ''}
                  aria-pressed={selected?.version === version.version}
                  onClick={() => {
                    setParams({ version: String(version.version) });
                    setEditor(null);
                    setDeleting(null);
                  }}
                >
                  {t('checklistUI.version')} {version.version}
                  <span>{t(`checklistUI.${version.state}`)}</span>
                </button>
              ))}
            </div>
          </div>
          {!selected && <ErrorMessage error={t('checklistUI.missingVersion')} />}
          {selected && checklistQuery.isPending && (
            <p className="checklist-state" role="status">
              {t('checklistUI.loading')}
            </p>
          )}
          {selected && checklistQuery.isError && (
            <ErrorMessage
              error={checklistError(checklistQuery.error, t)}
              retry={() => void checklistQuery.refetch()}
            />
          )}
          {selected && checklistQuery.data === null && (
            <ErrorMessage error={t('checklistUI.missingVersion')} />
          )}
          {selected && checklist && (
            <>
              {(versionsQuery.isFetching || checklistQuery.isFetching) && (
                <span className="checklist-refresh" role="status">
                  {t('checklistUI.refreshing')}
                </span>
              )}
              <div className="checklist-overview">
                <div>
                  <span>{t('checklistUI.version')}</span>
                  <strong>{selected.version}</strong>
                </div>
                <div>
                  <span>{t('checklistUI.state')}</span>
                  <strong className={`checklist-badge checklist-badge-${selected.state}`}>
                    {t(`checklistUI.${selected.state}`)}
                  </strong>
                </div>
                <div>
                  <span>{t('checklistUI.created')}</span>
                  <strong>{date(selected.created_at)}</strong>
                </div>
                <div>
                  <span>{t('checklistUI.publishedOn')}</span>
                  <strong>{date(selected.published_at)}</strong>
                </div>
                <div>
                  <span>{t('checklistUI.sections')}</span>
                  <strong>{checklist.sections.length}</strong>
                </div>
                <div>
                  <span>{t('checklistUI.checkpoints')}</span>
                  <strong>{totalItems}</strong>
                </div>
              </div>
              <div className="checklist-toolbar">
                <div>
                  <h2>{t('checklistUI.sections')}</h2>
                  <p>
                    {t('checklistUI.sectionCount', { count: checklist.sections.length })} ·{' '}
                    {t('checklistUI.checkpointCount', { count: totalItems })}
                  </p>
                </div>
                {editable && (
                  <button
                    type="button"
                    className="checklist-primary"
                    onClick={() => setEditor({ kind: 'section' })}
                  >
                    {t('checklistUI.addSection')}
                  </button>
                )}
              </div>
              {selected.state === 'draft' && (
                <div className="checklist-notice">
                  {!hseCapabilities.publishChecklist && (
                    <p>{t('checklistUI.publishUnavailable')}</p>
                  )}
                  {!hseCapabilities.reorderChecklist && (
                    <p>{t('checklistUI.reorderUnavailable')}</p>
                  )}
                  {!editable && <p>{t('checklistUI.supervisorReadOnly')}</p>}
                </div>
              )}
              {selected.state !== 'draft' && (
                <p className="checklist-readonly">{t('checklistUI.readOnly')}</p>
              )}
              {i18n.language === 'ar' && (
                <p className="checklist-language-note">{t('checklistUI.englishContent')}</p>
              )}
              {checklist.sections.length === 0 ? (
                <div className="checklist-empty">
                  {t(
                    selected.state === 'draft'
                      ? 'checklistUI.emptyDraft'
                      : 'checklistUI.emptyChecklist',
                  )}
                </div>
              ) : (
                <ChecklistContent
                  sections={checklist.sections}
                  editable={editable}
                  onAddItem={(section) => setEditor({ kind: 'item', section })}
                  onEditSection={(section) => setEditor({ kind: 'section', section })}
                  onDeleteSection={(section) => setDeleting({ kind: 'section', section })}
                  onEditItem={(item) => {
                    const section = checklist.sections.find(
                      (value) => value.id === item.section_id,
                    );
                    if (section) setEditor({ kind: 'item', section, item });
                  }}
                  onDeleteItem={(item) => setDeleting({ kind: 'item', item })}
                />
              )}
            </>
          )}
        </>
      )}
      {editable && selected && checklist && editor?.kind === 'section' && (
        <SectionDialog
          key={editor.section?.id ?? 'new-section'}
          version={selected.version}
          sections={checklist.sections}
          section={editor.section}
          onClose={() => setEditor(null)}
        />
      )}
      {editable && editor?.kind === 'item' && (
        <CheckpointDialog
          key={editor.item?.id ?? `new-${editor.section.id}`}
          section={editor.section}
          item={editor.item}
          onClose={() => setEditor(null)}
        />
      )}
      {editable && deleting && (
        <DeleteChecklistDialog target={deleting} onClose={() => setDeleting(null)} />
      )}
    </section>
  );
}
