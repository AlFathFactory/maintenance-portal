import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Equipment, EquipmentType } from '../../domain/equipment';
import { equipmentText } from '../../domain/localizedEquipment';
import type { AppLanguage } from '../../i18n';
import { useAuth } from '../auth/AuthProvider';
import { EquipmentIcon } from '../../shared/ui/EquipmentIcon';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { formatDate } from '../../shared/date';
import { useEquipmentList } from './queries';
import { EquipmentForm } from './EquipmentForm';

type Filter = EquipmentType | 'out_of_service' | 'maintenance' | 'all';

function StatCard({
  label,
  count,
  sub,
  kind,
}: {
  label: string;
  count: number;
  sub: string;
  kind: string;
}) {
  const symbol: Record<string, string> = { total: '▦', machine: '▤', crane: '♜', alert: '!' };
  return (
    <div className={`stat-card ${kind}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{symbol[kind]}</span>
      </div>
      <strong>{count}</strong>
      <small>{sub}</small>
    </div>
  );
}

function EquipmentRow({ item, open }: { item: Equipment; open(): void }) {
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.language === 'en' ? 'en' : 'ar';
  return (
    <tr
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') open();
      }}
      tabIndex={0}
    >
      <td>
        <div className="equipment-name">
          <EquipmentIcon type={item.type} />
          <div>
            <strong dir="auto">{equipmentText(item, 'name', language)}</strong>
            {equipmentText(item, 'model', language) && (
              <small>{equipmentText(item, 'model', language)}</small>
            )}
          </div>
        </div>
      </td>
      <td>
        <span className="code">
          {item.code || <span className="empty-value">{t('common.notRecorded')}</span>}
        </span>
      </td>
      <td>
        {equipmentText(item, 'location', language) || (
          <span className="empty-value">{t('common.notRecorded')}</span>
        )}
      </td>
      <td>{t(`equipmentType.${item.type}`)}</td>
      <td>
        <StatusBadge status={item.status} />
      </td>
      <td className="date-cell">
        {item.last_maintenance_on ? formatDate(item.last_maintenance_on) : '—'}
      </td>
      <td className="row-arrow">{language === 'ar' ? '←' : '→'}</td>
    </tr>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.language === 'en' ? 'en' : 'ar';
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const query = useEquipmentList();
  const items = query.data ?? [];
  const rawType = params.get('type');
  const rawStatus = params.get('status');
  const filter: Filter =
    rawStatus === 'out_of_service' || rawStatus === 'maintenance'
      ? rawStatus
      : rawType === 'machine' || rawType === 'crane'
        ? rawType
        : 'all';
  const counts = {
    machine: items.filter((item) => item.type === 'machine').length,
    crane: items.filter((item) => item.type === 'crane').length,
    out: items.filter((item) => item.status === 'out_of_service').length,
    maintenance: items.filter((item) => item.status === 'maintenance').length,
  };
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (filter === 'all' || item.type === filter || item.status === filter) &&
          [
            equipmentText(item, 'name', language),
            item.code,
            equipmentText(item, 'location', language),
            equipmentText(item, 'model', language),
            item.name,
            item.location,
            item.model,
          ]
            .join(' ')
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase()),
      ),
    [items, filter, search, language],
  );
  function selectFilter(value: Filter) {
    const next = new URLSearchParams(params);
    next.delete('type');
    next.delete('status');
    if (value === 'machine' || value === 'crane') next.set('type', value);
    if (value === 'out_of_service' || value === 'maintenance') next.set('status', value);
    setParams(next);
  }

  return (
    <>
      <section className="page-intro">
        <div>
          <div className="eyebrow">
            <span /> {t('dashboard.eyebrow')}
          </div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <div className="intro-actions">
          {isAdmin && (
            <button className="primary-button" onClick={() => setFormOpen(true)}>
              <span>＋</span> {t('dashboard.addEquipment')}
            </button>
          )}
        </div>
      </section>
      <section className="stats" aria-label={t('dashboard.stats')}>
        <StatCard
          label={t('dashboard.total')}
          count={items.length}
          sub={t('dashboard.allFactory')}
          kind="total"
        />
        <StatCard
          label={t('shell.machines')}
          count={counts.machine}
          sub={t('dashboard.machineFiles')}
          kind="machine"
        />
        <StatCard
          label={t('shell.cranes')}
          count={counts.crane}
          sub={t('dashboard.craneFiles')}
          kind="crane"
        />
        <StatCard
          label={t('status.out_of_service')}
          count={counts.out}
          sub={t('dashboard.needsFollowUp')}
          kind="alert"
        />
      </section>
      <section className="listing">
        <div className="list-heading">
          <div>
            <h2>{t('dashboard.register')}</h2>
            <p>{t('dashboard.registerHint')}</p>
          </div>
          <span className="result-count">{t('dashboard.count', { count: visible.length })}</span>
        </div>
        <div className="list-toolbar">
          <div className="tabs" role="tablist" aria-label={t('dashboard.filters')}>
            {(
              [
                ['all', t('dashboard.all'), items.length],
                ['machine', t('shell.machines'), counts.machine],
                ['crane', t('shell.cranes'), counts.crane],
                ['out_of_service', t('status.out_of_service'), counts.out],
                ['maintenance', t('status.maintenance'), counts.maintenance],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                className={`tab ${filter === value ? 'selected' : ''}`}
                role="tab"
                aria-selected={filter === value}
                onClick={() => selectFilter(value)}
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <span>⌕</span>
            <input
              type="search"
              aria-label={t('dashboard.search')}
              placeholder={t('dashboard.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {query.isPending ? (
          <div className="loading">{t('dashboard.loading')}</div>
        ) : query.error ? (
          <div className="panel">
            <ErrorMessage error={query.error} retry={() => void query.refetch()} />
          </div>
        ) : visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('equipment.equipment')}</th>
                  <th>{t('equipment.code')}</th>
                  <th>{t('equipment.location')}</th>
                  <th>{t('equipment.type')}</th>
                  <th>{t('equipment.status')}</th>
                  <th>{t('dashboard.lastMaintenance')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <EquipmentRow
                    key={item.id}
                    item={item}
                    open={() => navigate(`/equipment/${item.slug}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div>⌕</div>
            <h3>{t('dashboard.emptyTitle')}</h3>
            <p>{t('dashboard.emptyHint')}</p>
          </div>
        )}
      </section>
      {formOpen && (
        <EquipmentForm
          onClose={() => setFormOpen(false)}
          onSaved={(item) => {
            setFormOpen(false);
            navigate(`/equipment/${item.slug}`);
          }}
        />
      )}
    </>
  );
}
