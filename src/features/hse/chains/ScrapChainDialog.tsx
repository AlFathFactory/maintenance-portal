import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Chain } from '../../../domain/hse';
import { validateScrap } from '../../../services/hse/validation';
import { todayLocal } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { Modal } from '../../../shared/ui/Modal';
import { useToast } from '../../../shared/ui/ToastProvider';
import { useHSEChainActions } from '../queries';
import { chainError, chainPath } from './chainPresentation';
import { ChainFields, chainFieldInput, emptyChainFields } from './ChainFields';

export function ScrapChainDialog({ chain, onClose }: { chain: Chain; onClose(): void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const action = useHSEChainActions().scrap;
  const [date, setDate] = useState(todayLocal());
  const [reason, setReason] = useState('');
  const [replace, setReplace] = useState(false);
  const [fields, setFields] = useState(emptyChainFields());
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action.isPending || !confirmed) return;
    setError(null);
    try {
      const input = {
        chainId: chain.id,
        scrappingDate: date,
        reason: reason.trim() || null,
        replacement: replace ? chainFieldInput(fields) : undefined,
      };
      validateScrap(input, chain.start_working_date);
      const replacementId = await action.mutateAsync(input);
      if (replace && !replacementId) {
        onClose();
        navigate(chainPath(chain.id));
        toast.show(t('chainUI.failed'));
        return;
      }
      toast.show(t(replace ? 'chainUI.replacedToast' : 'chainUI.scrappedToast'));
      onClose();
      navigate(chainPath(replacementId ?? chain.id));
    } catch (cause) {
      setError(cause);
      toast.show(chainError(cause, t));
    }
  }
  return (
    <Modal
      title={t('chainUI.scrap')}
      subtitle={`${chain.tag_no} · ${chain.id}`}
      onClose={() => {
        if (!action.isPending) onClose();
      }}
    >
      <form className="chain-form" onSubmit={(event) => void submit(event)}>
        <p className="chain-warning">{t('chainUI.scrapWarning')}</p>
        <label>
          {t('chainUI.scrapDate')}
          <input
            type="date"
            required
            min={chain.start_working_date}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          {t('chainUI.scrapReason')}
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
        </label>
        <fieldset className="chain-mode">
          <legend>{t('chainUI.replacement')}</legend>
          <label>
            <input type="radio" checked={!replace} onChange={() => setReplace(false)} />
            {t('chainUI.scrapOnly')}
          </label>
          <label>
            <input type="radio" checked={replace} onChange={() => setReplace(true)} />
            {t('chainUI.scrapReplace')}
          </label>
        </fieldset>
        {replace && (
          <>
            <h3>{t('chainUI.replacementSpecs')}</h3>
            <ChainFields value={fields} onChange={setFields} disabled={action.isPending} />
          </>
        )}
        <label className="chain-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          {t('chainUI.confirmScrap')}
        </label>
        {error !== null && <ErrorMessage error={chainError(error, t)} />}
        <div className="chain-form-actions">
          <button
            type="button"
            className="chain-button"
            disabled={action.isPending}
            onClick={onClose}
          >
            {t('chainUI.cancel')}
          </button>
          <button
            className="chain-button chain-button-danger"
            type="submit"
            disabled={!confirmed || action.isPending}
          >
            {t(replace ? 'chainUI.scrapReplace' : 'chainUI.scrapOnly')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
