import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Chain } from '../../../domain/hse';
import { validateChainCreate, validateChainFields } from '../../../services/hse/validation';
import { useToast } from '../../../shared/ui/ToastProvider';
import { formatDate } from '../../../shared/date';
import { ErrorMessage } from '../../../shared/ui/ErrorMessage';
import { useHSEChain, useHSEChainActions, useHSEChainLineage, useHSEChains } from '../queries';
import { chainError, chainPath, pageSize } from './chainPresentation';
import { ChainFields, chainFieldInput, emptyChainFields, toChainFields } from './ChainFields';
import './chains.css';

export function NewChainPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [replacementMode, setReplacementMode] = useState(params.has('replaces'));
  const [predecessorSearch, setPredecessorSearch] = useState('');
  const [candidatePage, setCandidatePage] = useState(1);
  const predecessorId = params.get('replaces') ?? '';
  const predecessor = useHSEChain(predecessorId);
  const lineage = useHSEChainLineage(predecessorId);
  const candidates = useHSEChains(
    {
      status: 'scrapped',
      tagNo: predecessorSearch || undefined,
      offset: (candidatePage - 1) * pageSize,
      limit: pageSize,
    },
    replacementMode,
  );
  const available =
    predecessor.data?.status === 'scrapped' && lineage.data?.successors.length === 0;
  return (
    <section className="hse-page chain-page">
      <div className="chain-heading">
        <div className="hse-page-heading">
          <span className="hse-page-kicker">{t('hse.title')}</span>
          <h1>{t('chainUI.add')}</h1>
          <p>{t('chainUI.inventoryIntro')}</p>
        </div>
        <Link to="/hse/chains">{t('chainUI.back')}</Link>
      </div>
      <div className="chain-panel chain-form-panel">
        <fieldset className="chain-mode">
          <legend>{t('chainUI.replacement')}</legend>
          <label>
            <input
              type="radio"
              checked={!replacementMode}
              onChange={() => {
                setReplacementMode(false);
                setParams({});
              }}
            />
            {t('chainUI.newMode')}
          </label>
          <label>
            <input
              type="radio"
              checked={replacementMode}
              onChange={() => setReplacementMode(true)}
            />
            {t('chainUI.replacementMode')}
          </label>
        </fieldset>
        {replacementMode && (
          <div className="chain-predecessor">
            {candidates.isPending && <p role="status">{t('chainUI.loading')}</p>}
            {candidates.isError && (
              <ErrorMessage
                error={chainError(candidates.error, t)}
                retry={() => void candidates.refetch()}
              />
            )}
            {candidates.data?.length === 0 && <p>{t('chainUI.noResults')}</p>}
            <label>
              {t('chainUI.choosePredecessor')}
              <input
                type="search"
                value={predecessorSearch}
                onChange={(event) => {
                  setPredecessorSearch(event.target.value);
                  setCandidatePage(1);
                }}
                placeholder={t('chainUI.search')}
              />
            </label>
            <select
              aria-label={t('chainUI.choosePredecessor')}
              value={predecessorId}
              onChange={(event) => setParams({ replaces: event.target.value })}
            >
              <option value="">{t('chainUI.choosePredecessor')}</option>
              {(candidates.data ?? []).map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.tag_no} · {chain.id.slice(0, 8)} · {chain.scrapping_date ?? ''}
                </option>
              ))}
              {predecessor.data &&
                !(candidates.data ?? []).some((chain) => chain.id === predecessor.data?.id) && (
                  <option value={predecessor.data.id}>
                    {predecessor.data.tag_no} · {predecessor.data.id.slice(0, 8)}
                  </option>
                )}
            </select>
            <div className="chain-pagination">
              <button
                type="button"
                disabled={candidatePage <= 1}
                onClick={() => setCandidatePage(candidatePage - 1)}
              >
                {t('chainUI.previous')}
              </button>
              <button
                type="button"
                disabled={(candidates.data?.length ?? 0) < pageSize}
                onClick={() => setCandidatePage(candidatePage + 1)}
              >
                {t('chainUI.next')}
              </button>
            </div>
            {predecessorId && predecessor.data && (
              <p>
                {t('chainUI.predecessorHint')} <strong dir="auto">{predecessor.data.tag_no}</strong>{' '}
                · {predecessor.data.number_of_legs} {t('chainUI.legs')} ·{' '}
                {predecessor.data.working_load_limit_tons} {t('chainUI.wll')}
                {' · '}
                {predecessor.data.length_m} {t('chainUI.length')}
                {' · '}
                {t('chainUI.scrapDate')}: {formatDate(predecessor.data.scrapping_date)}
              </p>
            )}
            {predecessorId && predecessor.isError && (
              <ErrorMessage
                error={chainError(predecessor.error, t)}
                retry={() => void predecessor.refetch()}
              />
            )}
            {predecessorId && lineage.isError && (
              <ErrorMessage
                error={chainError(lineage.error, t)}
                retry={() => void lineage.refetch()}
              />
            )}
            {predecessorId && predecessor.data && lineage.data && !available && (
              <ErrorMessage error={t('chainUI.invalidLineage')} />
            )}
          </div>
        )}
        <ChainForm
          key={replacementMode ? predecessorId || 'replacement' : 'new'}
          predecessor={replacementMode ? (available ? predecessor.data : undefined) : null}
          blocked={replacementMode && !available}
        />
      </div>
    </section>
  );
}

export function ChainForm({
  chain,
  predecessor,
  blocked = false,
  onDone,
  onCancel,
}: {
  chain?: Chain;
  predecessor?: Chain | null;
  blocked?: boolean;
  onDone?(): void;
  onCancel?(): void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const actions = useHSEChainActions();
  const [tag, setTag] = useState(predecessor?.tag_no ?? '');
  const [fields, setFields] = useState(chain ? toChainFields(chain) : emptyChainFields());
  const [error, setError] = useState<unknown>(null);
  const pending = actions.create.isPending || actions.update.isPending;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || blocked) return;
    setError(null);
    try {
      const specs = chainFieldInput(fields);
      if (chain) {
        validateChainFields(specs);
        const updated = await actions.update.mutateAsync({ id: chain.id, input: specs });
        toast.show(t('chainUI.updatedToast'));
        onDone?.();
        if (!onDone) navigate(chainPath(updated.id));
      } else {
        const input = {
          ...specs,
          tag_no: predecessor?.tag_no ?? tag.trim(),
          replaces_chain_id: predecessor?.id ?? null,
        };
        validateChainCreate(input);
        const created = await actions.create.mutateAsync(input);
        toast.show(t('chainUI.createdToast'));
        navigate(chainPath(created.id));
      }
    } catch (cause) {
      setError(cause);
      toast.show(chainError(cause, t));
    }
  }
  return (
    <form onSubmit={(event) => void submit(event)} className="chain-form">
      {chain ? (
        <p>
          {t('chainUI.tag')}: <strong dir="auto">{chain.tag_no}</strong>
        </p>
      ) : (
        <label>
          {t('chainUI.tag')}
          <input
            required
            maxLength={100}
            value={predecessor?.tag_no ?? tag}
            readOnly={Boolean(predecessor)}
            onChange={(event) => setTag(event.target.value)}
          />
        </label>
      )}
      <ChainFields value={fields} onChange={setFields} disabled={pending} />
      {error !== null && <ErrorMessage error={chainError(error, t)} />}
      <div className="chain-form-actions">
        {onCancel && (
          <button type="button" className="chain-button" onClick={onCancel} disabled={pending}>
            {t('chainUI.cancel')}
          </button>
        )}
        <button
          type="submit"
          className="chain-button chain-button-primary"
          disabled={pending || blocked}
        >
          {t(chain ? 'chainUI.save' : 'chainUI.create')}
        </button>
      </div>
    </form>
  );
}
