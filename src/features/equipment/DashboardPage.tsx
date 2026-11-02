import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Equipment, EquipmentType } from '../../domain/equipment';
import { typeLabels } from '../../domain/equipment';
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
            <strong>{item.name}</strong>
            {item.model && <small>{item.model}</small>}
          </div>
        </div>
      </td>
      <td>
        <span className="code">{item.code || <span className="empty-value">غير مسجل</span>}</span>
      </td>
      <td>{item.location || <span className="empty-value">غير مسجل</span>}</td>
      <td>{typeLabels[item.type]}</td>
      <td>
        <StatusBadge status={item.status} />
      </td>
      <td className="date-cell">
        {item.last_maintenance_on ? formatDate(item.last_maintenance_on) : '—'}
      </td>
      <td className="row-arrow">←</td>
    </tr>
  );
}

export function DashboardPage() {
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
          [item.name, item.code, item.location, item.model]
            .join(' ')
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase()),
      ),
    [items, filter, search],
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
            <span /> إدارة المعدات
          </div>
          <h1>نظرة عامة على معدات المصنع</h1>
          <p>بيانات الماكينات والأوناش وحالتها الحالية في مكان واحد.</p>
        </div>
        <div className="intro-actions">
          {isAdmin && (
            <button className="primary-button" onClick={() => setFormOpen(true)}>
              <span>＋</span> إضافة معدة
            </button>
          )}
        </div>
      </section>
      <section className="stats" aria-label="ملخص المعدات">
        <StatCard
          label="إجمالي المعدات"
          count={items.length}
          sub="جميع معدات المصنع"
          kind="total"
        />
        <StatCard label="الماكينات" count={counts.machine} sub="ملفات الماكينات" kind="machine" />
        <StatCard label="الأوناش" count={counts.crane} sub="ملفات الأوناش" kind="crane" />
        <StatCard label="خارج الخدمة" count={counts.out} sub="تحتاج متابعة" kind="alert" />
      </section>
      <section className="listing">
        <div className="list-heading">
          <div>
            <h2>سجل المعدات</h2>
            <p>اختر معدة لعرض ملفها ورمز QR الخاص بها.</p>
          </div>
          <span className="result-count">{visible.length} معدة</span>
        </div>
        <div className="list-toolbar">
          <div className="tabs" role="tablist" aria-label="تصفية المعدات">
            {(
              [
                ['all', 'الكل', items.length],
                ['machine', 'الماكينات', counts.machine],
                ['crane', 'الأوناش', counts.crane],
                ['out_of_service', 'خارج الخدمة', counts.out],
                ['maintenance', 'تحت الصيانة', counts.maintenance],
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
              aria-label="بحث في المعدات"
              placeholder="ابحث بالاسم أو الكود أو المكان"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {query.isPending ? (
          <div className="loading">جارٍ تحميل بيانات المعدات...</div>
        ) : query.error ? (
          <div className="panel">
            <ErrorMessage error={query.error} retry={() => void query.refetch()} />
          </div>
        ) : visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المعدة</th>
                  <th>الكود</th>
                  <th>الموقع</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>آخر صيانة</th>
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
            <h3>لا توجد معدات مطابقة</h3>
            <p>جرّب كلمة بحث مختلفة أو غيّر تصفية المعدات.</p>
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
