import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChecklistSectionWithItems } from '../../../domain/hse';
import { HSEError } from '../../../services/hse/errors';
import { validateSectionCreate, validateSectionUpdate } from '../../../services/hse/validation';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { ChecklistDialog } from './ChecklistDialog';
import { useToast } from '../../../shared/ui/ToastProvider';
import { useHSEChecklistActions } from '../queries';
import { assertUniqueSectionKey, checklistError, nextSortOrder } from './checklistModel';

export function SectionDialog({
  version,
  sections,
  section,
  onClose,
}: {
  version: number;
  sections: ChecklistSectionWithItems[];
  section?: ChecklistSectionWithItems;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { createSection, updateSection } = useHSEChecklistActions();
  const [key, setKey] = useState(section?.section_key ?? '');
  const [english, setEnglish] = useState(section?.name_en ?? '');
  const [arabic, setArabic] = useState(section?.name_ar ?? '');
  const [error, setError] = useState<string | null>(null);
  const pending = createSection.isPending || updateSection.isPending;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const fields = { section_key: key.trim(), name_en: english.trim(), name_ar: arabic.trim() };
    try {
      assertUniqueSectionKey(sections, fields.section_key, section?.id);
      if (section) {
        validateSectionUpdate(fields);
        await updateSection.mutateAsync({ id: section.id, input: fields });
      } else {
        const input = {
          ...fields,
          template_version: version,
          sort_order: nextSortOrder(sections.map((item) => item.sort_order)),
        };
        validateSectionCreate(input);
        await createSection.mutateAsync(input);
      }
      toast.show(t('checklistUI.saved'));
      onClose();
    } catch (cause) {
      const detail = cause instanceof HSEError ? cause.cause : null;
      const duplicateKey =
        cause instanceof HSEError &&
        cause.code === 'DUPLICATE_RECORD' &&
        (detail === 'SECTION_KEY' ||
          (detail !== null &&
            typeof detail === 'object' &&
            'message' in detail &&
            /section_key/i.test(String(detail.message))));
      const message = duplicateKey ? t('checklistUI.duplicateKey') : checklistError(cause, t);
      setError(message);
      toast.show(message);
    }
  }
  return (
    <ChecklistDialog
      title={t(section ? 'checklistUI.editSection' : 'checklistUI.addSection')}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form className="checklist-form" onSubmit={(event) => void submit(event)}>
        <label>
          {t('checklistUI.sectionKey')}
          <input required value={key} onChange={(event) => setKey(event.target.value)} />
        </label>
        <label>
          {t('checklistUI.nameEnglish')}
          <input
            required
            lang="en"
            dir="ltr"
            value={english}
            onChange={(event) => setEnglish(event.target.value)}
          />
        </label>
        <label>
          {t('checklistUI.nameArabic')}
          <input
            required
            lang="ar"
            dir="rtl"
            value={arabic}
            onChange={(event) => setArabic(event.target.value)}
          />
        </label>
        {error && <ErrorMessage error={error} />}
        <div className="checklist-dialog-actions">
          <button type="button" onClick={onClose} disabled={pending}>
            {t('checklistUI.cancel')}
          </button>
          <button type="submit" className="checklist-primary" disabled={pending}>
            {t('checklistUI.save')}
          </button>
        </div>
      </form>
    </ChecklistDialog>
  );
}
