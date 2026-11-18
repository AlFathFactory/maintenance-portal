import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChecklistItem, ChecklistSectionWithItems } from '../../../domain/hse';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { ChecklistDialog } from './ChecklistDialog';
import { useToast } from '../../../shared/ui/ToastProvider';
import { useHSEChecklistActions } from '../queries';
import { checklistError } from './checklistModel';

export type DeleteTarget =
  { kind: 'section'; section: ChecklistSectionWithItems } | { kind: 'item'; item: ChecklistItem };

export function DeleteChecklistDialog({
  target,
  onClose,
}: {
  target: DeleteTarget;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { deleteSection, deleteItem } = useHSEChecklistActions();
  const [error, setError] = useState<string | null>(null);
  const pending = deleteSection.isPending || deleteItem.isPending;
  async function remove() {
    if (pending) return;
    setError(null);
    try {
      if (target.kind === 'section') await deleteSection.mutateAsync(target.section.id);
      else await deleteItem.mutateAsync(target.item.id);
      toast.show(t('checklistUI.deleted'));
      onClose();
    } catch (cause) {
      const message = checklistError(cause, t);
      setError(message);
      toast.show(message);
    }
  }
  return (
    <ChecklistDialog
      title={t('checklistUI.confirmDelete')}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <div className="checklist-delete">
        <p>
          {target.kind === 'section'
            ? t('checklistUI.deleteSectionWarning', { count: target.section.items.length })
            : t('checklistUI.deleteCheckpointWarning')}
        </p>
        {error && <ErrorMessage error={error} />}
        <div className="checklist-dialog-actions">
          <button type="button" disabled={pending} onClick={onClose}>
            {t('checklistUI.cancel')}
          </button>
          <button
            type="button"
            className="checklist-danger"
            disabled={pending}
            onClick={() => void remove()}
          >
            {t('checklistUI.confirmDelete')}
          </button>
        </div>
      </div>
    </ChecklistDialog>
  );
}
