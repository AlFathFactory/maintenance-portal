import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChecklistItem, ChecklistSectionWithItems } from '../../../domain/hse';
import { validateItemCreate, validateItemUpdate } from '../../../services/hse/validation';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { ChecklistDialog } from './ChecklistDialog';
import { useToast } from '../../../shared/ui/ToastProvider';
import { useHSEChecklistActions } from '../queries';
import { checklistError, nextSortOrder } from './checklistModel';

export function CheckpointDialog({
  section,
  item,
  onClose,
}: {
  section: ChecklistSectionWithItems;
  item?: ChecklistItem;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { createItem, updateItem } = useHSEChecklistActions();
  const [text, setText] = useState(item?.check_text_en ?? '');
  const [error, setError] = useState<string | null>(null);
  const pending = createItem.isPending || updateItem.isPending;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    try {
      const check_text_en = text.trim();
      if (item) {
        const input = { check_text_en };
        validateItemUpdate(input);
        await updateItem.mutateAsync({ id: item.id, input });
      } else {
        const input = {
          check_text_en,
          section_id: section.id,
          template_version: section.template_version,
          sort_order: nextSortOrder(section.items.map((entry) => entry.sort_order)),
        };
        validateItemCreate(input);
        await createItem.mutateAsync(input);
      }
      toast.show(t('checklistUI.saved'));
      onClose();
    } catch (cause) {
      const message = checklistError(cause, t);
      setError(message);
      toast.show(message);
    }
  }
  return (
    <ChecklistDialog
      title={t(item ? 'checklistUI.editCheckpoint' : 'checklistUI.addCheckpoint')}
      subtitle={section.name_en}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form className="checklist-form" onSubmit={(event) => void submit(event)}>
        <label>
          {t('checklistUI.checkpointText')}
          <textarea
            required
            rows={5}
            lang="en"
            dir="ltr"
            value={text}
            onChange={(event) => setText(event.target.value)}
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
