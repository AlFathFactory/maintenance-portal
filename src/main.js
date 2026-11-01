import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { seedEquipment, statuses, typeLabels } from './data.js';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const connected = Boolean(url && key && !url.includes('YOUR_PROJECT'));
const db = connected ? createClient(url, key) : null;
const storeKey = 'fateh-maintenance-demo-v1';
const app = document.querySelector('#app');
const state = { equipment: [], records: [], admin: false, user: null, loading: true, filter: 'all', search: '', modal: null, toast: '', error: '' };

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const textOrDash = (value) => value ? escapeHtml(value) : '<span class="empty-value">غير مسجل</span>';
const dateText = (value) => value ? new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'لم تُسجل صيانة بعد';
const routeSlug = () => decodeURIComponent((location.hash.match(/^#\/equipment\/([^/?]+)/) || [])[1] || '');
const statusBadge = (value) => `<span class="badge ${statuses[value]?.tone || 'muted'}"><i></i>${statuses[value]?.label || 'غير محددة'}</span>`;
const icon = (name) => ({ grid: '▦', machine: '▤', crane: '♜', qr: '▣', wrench: '⚙', arrow: '←', plus: '+', search: '⌕', logout: '↪' })[name] || '•';

function demoRead() {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey));
    if (saved?.equipment?.length) return saved;
  } catch { /* use source data */ }
  return { equipment: structuredClone(seedEquipment), records: [] };
}
function demoSave() { localStorage.setItem(storeKey, JSON.stringify({ equipment: state.equipment, records: state.records })); }
function notify(message) { state.toast = message; render(); setTimeout(() => { if (state.toast === message) { state.toast = ''; render(); } }, 3500); }
function fail(message) { state.error = message; render(); }

async function load() {
  state.loading = true; render();
  if (!connected) {
    const local = demoRead(); state.equipment = local.equipment; state.records = local.records; state.admin = true; state.loading = false; render(); return;
  }
  try {
    const { data: { session } } = await db.auth.getSession();
    state.user = session?.user || null;
    const { data, error } = await db.from('equipment').select('*').order('type').order('slug');
    if (error) throw error;
    state.equipment = data || [];
    state.admin = false;
    state.records = [];
    if (state.user) {
      const check = await db.from('maintenance_admins').select('user_id').eq('user_id', state.user.id).maybeSingle();
      if (check.error) throw check.error;
      state.admin = Boolean(check.data);
      if (state.admin) {
        const history = await db.from('maintenance_records').select('*').order('performed_on', { ascending: false });
        if (history.error) throw history.error;
        state.records = history.data || [];
      }
    }
    state.error = '';
  } catch (error) { state.error = `تعذر تحميل البيانات: ${error.message}`; }
  state.loading = false; render();
}

function shell(content) {
  return `<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">F</div><div><strong>فتح الصناعية</strong><small>قسم الصيانة</small></div></div>
      <div class="side-label">القائمة الرئيسية</div>
      <nav aria-label="القائمة الرئيسية">
        <a class="nav-item ${!routeSlug() ? 'active' : ''}" href="#/">${icon('grid')} <span>لوحة المعدات</span></a>
        <a class="nav-item" href="#/" data-filter-link="machine">${icon('machine')} <span>الماكينات</span></a>
        <a class="nav-item" href="#/" data-filter-link="crane">${icon('crane')} <span>الأوناش</span></a>
      </nav>
      <div class="sidebar-bottom"><div class="sidebar-note"><span class="note-icon">▣</span><strong>ملف لكل معدة</strong><p>امسح رمز QR للوصول إلى بيانات المعدة مباشرة.</p></div><div class="side-foot">MAINTENANCE SYSTEM <span>2026</span></div></div>
    </aside>
    <div class="main-wrap">
      <header class="topbar"><div class="mobile-brand"><div class="brand-mark">F</div><strong>قسم الصيانة</strong></div><div class="breadcrumb">قسم الصيانة <span>/</span> ${routeSlug() ? 'تفاصيل المعدة' : 'لوحة المعدات'}</div><div class="top-actions">${!connected ? '<span class="demo-pill">نسخة تجريبية محلية</span>' : ''}${state.admin ? `<span class="account-chip">${connected ? escapeHtml(state.user?.email || 'مسؤول الصيانة') : 'وضع المسؤول التجريبي'}</span>${connected ? '<button class="text-button" data-action="logout">خروج</button>' : ''}` : '<button class="login-button" data-action="login">دخول مسؤول الصيانة</button>'}</div></header>
      <main>${state.error ? `<div class="error-banner">${escapeHtml(state.error)} <button data-action="retry">إعادة المحاولة</button></div>` : ''}${content}</main>
    </div>
  </div>${state.modal ? modal() : ''}${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ''}`;
}

function dashboard() {
  const all = state.equipment;
  const machines = all.filter((e) => e.type === 'machine').length;
  const cranes = all.filter((e) => e.type === 'crane').length;
  const out = all.filter((e) => e.status === 'out_of_service').length;
  const visible = all.filter((e) => (state.filter === 'all' || e.type === state.filter) && [e.name, e.code, e.location, e.model].join(' ').toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
  return `<section class="page-intro"><div><div class="eyebrow"><span></span> إدارة المعدات</div><h1>نظرة عامة على معدات المصنع</h1><p>بيانات الماكينات والأوناش وحالتها الحالية في مكان واحد.</p></div><div class="intro-actions">${state.admin ? `<button class="primary-button" data-action="add-equipment"><span>＋</span> إضافة معدة</button>` : ''}</div></section>
    <section class="stats" aria-label="ملخص المعدات">
      ${statCard('إجمالي المعدات', all.length, 'جميع معدات المصنع', 'total')}
      ${statCard('الماكينات', machines, 'ملفات الماكينات', 'machine')}
      ${statCard('الأوناش', cranes, 'ملفات الأوناش', 'crane')}
      ${statCard('خارج الخدمة', out, 'تحتاج متابعة', 'alert')}
    </section>
    <section class="listing"><div class="list-heading"><div><h2>سجل المعدات</h2><p>اختر معدة لعرض ملفها ورمز QR الخاص بها.</p></div><span class="result-count">${visible.length} معدة</span></div>
      <div class="list-toolbar"><div class="tabs" role="tablist"><button class="tab ${state.filter === 'all' ? 'selected' : ''}" data-filter="all">الكل <span>${all.length}</span></button><button class="tab ${state.filter === 'machine' ? 'selected' : ''}" data-filter="machine">الماكينات <span>${machines}</span></button><button class="tab ${state.filter === 'crane' ? 'selected' : ''}" data-filter="crane">الأوناش <span>${cranes}</span></button></div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="ابحث بالاسم أو الكود أو المكان" value="${escapeHtml(state.search)}" /></label></div>
      ${visible.length ? `<div class="table-wrap"><table><thead><tr><th>المعدة</th><th>الكود</th><th>الموقع</th><th>النوع</th><th>الحالة</th><th>آخر صيانة</th><th></th></tr></thead><tbody>${visible.map(equipmentRow).join('')}</tbody></table></div>` : `<div class="empty-state"><div>⌕</div><h3>لا توجد معدات مطابقة</h3><p>جرّب كلمة بحث مختلفة أو غيّر نوع المعدة.</p></div>`}
    </section>`;
}
function statCard(label, count, sub, kind) { return `<div class="stat-card ${kind}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${{ total: '▦', machine: '▤', crane: '♜', alert: '!' }[kind]}</span></div><strong>${count}</strong><small>${sub}</small></div>`; }
function equipmentRow(item) { return `<tr data-href="#/equipment/${encodeURIComponent(item.slug)}" tabindex="0"><td><div class="equipment-name"><span class="equipment-icon ${item.type}">${item.type === 'crane' ? '♜' : '▤'}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.model || 'ملف المعدة')}</small></div></div></td><td><span class="code">${textOrDash(item.code)}</span></td><td>${textOrDash(item.location)}</td><td>${typeLabels[item.type] || 'معدة'}</td><td>${statusBadge(item.status)}</td><td class="date-cell">${item.last_maintenance_on ? dateText(item.last_maintenance_on) : '—'}</td><td class="row-arrow">←</td></tr>`; }

function detail(item) {
  const records = state.records.filter((r) => r.equipment_id === item.id || r.equipment_slug === item.slug);
  const fields = [ ['الاسم', item.name], ['الكود', item.code], ['الموديل', item.model], ['القدرة', item.power], ['بلد الصنع', item.made_in], ['الموقع', item.location], ...(item.type === 'crane' ? [['الحمولة القصوى', item.max_load], ['الارتفاع', item.height], ['العرض', item.width]] : [['L', item.length_spec], ['P', item.p_spec]]) ];
  return `<div class="detail"><a href="#/" class="back-link">→ العودة إلى المعدات</a><div class="detail-hero"><div><div class="detail-kicker"><span class="equipment-icon ${item.type}">${item.type === 'crane' ? '♜' : '▤'}</span>${typeLabels[item.type] || 'معدة'} <span class="divider-dot">•</span> ${escapeHtml(item.code || item.slug)}</div><h1>${escapeHtml(item.name)}</h1><div class="hero-meta">${statusBadge(item.status)} <span>⌖ ${escapeHtml(item.location || 'الموقع غير مسجل')}</span></div></div><div class="hero-actions">${state.admin ? `<button class="outline-button" data-action="edit-equipment" data-slug="${escapeHtml(item.slug)}">تعديل البيانات</button><button class="primary-button" data-action="status" data-slug="${escapeHtml(item.slug)}">تغيير الحالة</button>` : ''}</div></div>
    <div class="detail-grid"><div class="detail-main"><section class="panel"><div class="panel-heading"><div><h2>بيانات المعدة</h2><p>المعلومات الثابتة الواردة في سجل المعدات.</p></div></div><div class="field-grid">${fields.map(([label, value]) => `<div class="field"><span>${escapeHtml(label)}</span><strong>${textOrDash(value)}</strong></div>`).join('')}</div></section>
    <section class="panel history-panel"><div class="panel-heading"><div><h2>سجل الصيانة</h2><p>${state.admin ? 'كل عمليات الصيانة المسجلة لهذه المعدة.' : 'تفاصيل أعمال الصيانة متاحة لمسؤول القسم.'}</p></div>${state.admin ? `<button class="small-primary" data-action="maintenance" data-slug="${escapeHtml(item.slug)}">＋ تسجيل صيانة</button>` : ''}</div>${state.admin ? (records.length ? `<div class="timeline">${records.map((r) => `<div class="timeline-item"><span class="timeline-dot"></span><div><div class="timeline-top"><strong>${escapeHtml(r.kind === 'periodic' ? 'صيانة دورية' : 'إصلاح عطل')}</strong><time>${dateText(r.performed_on)}</time></div><p>${escapeHtml(r.notes)}</p></div></div>`).join('')}</div>` : `<div class="history-empty"><span>⚙</span><strong>لا توجد عمليات صيانة مسجلة</strong><p>أضف أول عملية صيانة لتظهر هنا.</p></div>`) : `<div class="history-empty compact"><span>🔒</span><p>سجّل الدخول كمسؤول صيانة لعرض الملاحظات وسجل العمليات.</p></div>`}</section></div>
    <aside class="detail-side"><section class="qr-panel"><div class="qr-overline">بطاقة المعدة الرقمية</div><h2>رمز الوصول السريع</h2><p>امسح الرمز لفتح ملف هذه المعدة على الهاتف.</p><div class="qr-frame"><canvas id="qr-canvas" aria-label="رمز QR للمعدة"></canvas></div><div class="qr-equipment"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.code || item.slug)}</span></div><button class="qr-download" data-action="download-qr" data-slug="${escapeHtml(item.slug)}">↓ تحميل رمز QR</button><button class="qr-print" data-action="print-qr" data-slug="${escapeHtml(item.slug)}">طباعة البطاقة</button></section><section class="last-service"><span class="service-icon">⚙</span><div><small>آخر صيانة مسجلة</small><strong>${dateText(item.last_maintenance_on)}</strong></div></section></aside></div></div>`;
}

function modal() {
  const { kind, slug } = state.modal;
  const item = state.equipment.find((e) => e.slug === slug);
  let body = '';
  if (kind === 'login') body = `<h2>دخول مسؤول الصيانة</h2><p class="modal-subtitle">استخدم حساب القسم المسجل في Supabase.</p><form id="login-form"><label>البريد الإلكتروني<input name="email" type="email" required autocomplete="email" /></label><label>كلمة المرور<input name="password" type="password" required autocomplete="current-password" /></label><div class="form-actions"><button type="button" class="outline-button" data-action="close-modal">إلغاء</button><button class="primary-button">دخول</button></div></form>`;
  if (kind === 'equipment') body = `<h2>${item ? 'تعديل بيانات المعدة' : 'إضافة معدة'}</h2><p class="modal-subtitle">املأ البيانات المتاحة. يمكنك ترك الحقول غير المعروفة فارغة.</p><form id="equipment-form"><div class="form-grid"><label>النوع<select name="type" required><option value="machine" ${item?.type === 'machine' ? 'selected' : ''}>ماكينة</option><option value="crane" ${item?.type === 'crane' ? 'selected' : ''}>ونش</option></select></label>${fieldInput('name', 'اسم المعدة', item?.name, true)}${fieldInput('code', 'الكود', item?.code)}${fieldInput('model', 'الموديل', item?.model)}${fieldInput('power', 'القدرة', item?.power)}${fieldInput('made_in', 'بلد الصنع', item?.made_in)}${fieldInput('location', 'الموقع', item?.location)}${fieldInput('length_spec', 'L (للمكينات)', item?.length_spec)}${fieldInput('p_spec', 'P (للمكينات)', item?.p_spec)}${fieldInput('max_load', 'الحمولة القصوى (للأوناش)', item?.max_load)}${fieldInput('height', 'الارتفاع (للأوناش)', item?.height)}${fieldInput('width', 'العرض (للأوناش)', item?.width)}</div><div class="form-actions"><button type="button" class="outline-button" data-action="close-modal">إلغاء</button><button class="primary-button">حفظ البيانات</button></div></form>`;
  if (kind === 'status') body = `<h2>تغيير حالة المعدة</h2><p class="modal-subtitle">${escapeHtml(item?.name || '')}</p><form id="status-form"><label>الحالة الجديدة<select name="status" required>${Object.entries(statuses).map(([value, x]) => `<option value="${value}" ${item?.status === value ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label><div class="form-actions"><button type="button" class="outline-button" data-action="close-modal">إلغاء</button><button class="primary-button">حفظ الحالة</button></div></form>`;
  if (kind === 'maintenance') body = `<h2>تسجيل عملية صيانة</h2><p class="modal-subtitle">${escapeHtml(item?.name || '')}</p><form id="maintenance-form"><div class="form-grid"><label>نوع العملية<select name="kind"><option value="repair">إصلاح عطل</option><option value="periodic">صيانة دورية</option></select></label><label>تاريخ الصيانة<input type="date" name="performed_on" value="${new Date().toLocaleDateString('en-CA')}" required /></label></div><label>ملاحظات الصيانة<textarea name="notes" rows="5" placeholder="اكتب الأعمال التي تمت والنتيجة..." required></textarea></label><label>الحالة بعد الصيانة<select name="status_after"><option value="">لا تغيّر الحالة</option>${Object.entries(statuses).filter(([v]) => v !== 'unknown').map(([v, x]) => `<option value="${v}">${x.label}</option>`).join('')}</select></label><div class="form-actions"><button type="button" class="outline-button" data-action="close-modal">إلغاء</button><button class="primary-button">حفظ الصيانة</button></div></form>`;
  return `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(kind)}"><button class="modal-close" data-action="close-modal" aria-label="إغلاق">×</button>${body}</div></div>`;
}
function fieldInput(name, label, value, required = false) { return `<label>${label}<input name="${name}" value="${escapeHtml(value || '')}" ${required ? 'required' : ''} /></label>`; }

function render() {
  const slug = routeSlug(); const item = state.equipment.find((e) => e.slug === slug);
  app.innerHTML = shell(state.loading ? '<div class="loading">جارٍ تحميل بيانات المعدات...</div>' : slug ? (item ? detail(item) : '<div class="not-found"><h1>المعدة غير موجودة</h1><a href="#/">العودة إلى المعدات</a></div>') : dashboard());
  if (item) { const canvas = document.querySelector('#qr-canvas'); if (canvas) QRCode.toCanvas(canvas, `${location.origin}${location.pathname}#/equipment/${encodeURIComponent(item.slug)}`, { width: 190, margin: 1, color: { dark: '#0b2b34', light: '#ffffff' } }); }
}

async function saveEquipment(form) {
  const item = state.equipment.find((e) => e.slug === state.modal.slug);
  const fields = Object.fromEntries(new FormData(form));
  for (const key of Object.keys(fields)) fields[key] = fields[key].trim();
  const next = { ...fields, slug: item?.slug || `equipment-${crypto.randomUUID().slice(0, 10)}`, status: item?.status || 'unknown', last_maintenance_on: item?.last_maintenance_on || null };
  if (connected) {
    const response = item ? await db.from('equipment').update(fields).eq('id', item.id).select().single() : await db.from('equipment').insert(next).select().single();
    if (response.error) throw response.error;
    if (item) Object.assign(item, response.data); else state.equipment.push(response.data);
  } else { if (item) Object.assign(item, fields); else state.equipment.push(next); demoSave(); }
  state.modal = null; location.hash = `#/equipment/${encodeURIComponent(next.slug)}`; notify('تم حفظ بيانات المعدة');
}
async function saveStatus(form) {
  const item = state.equipment.find((e) => e.slug === state.modal.slug);
  const status = new FormData(form).get('status');
  if (connected) { const { error } = await db.from('equipment').update({ status }).eq('id', item.id); if (error) throw error; }
  item.status = status; if (!connected) demoSave(); state.modal = null; notify('تم تحديث حالة المعدة');
}
async function saveMaintenance(form) {
  const item = state.equipment.find((e) => e.slug === state.modal.slug);
  const data = Object.fromEntries(new FormData(form));
  data.notes = data.notes.trim();
  if (!data.notes) throw new Error('اكتب ملاحظات الصيانة.');
  const record = { equipment_id: item.id, equipment_slug: item.slug, kind: data.kind, performed_on: data.performed_on, notes: data.notes, status_after: data.status_after || null };
  if (connected) {
    delete record.equipment_slug;
    const result = await db.from('maintenance_records').insert(record).select().single();
    if (result.error) throw result.error;
    state.records.unshift(result.data);
    await load();
  } else {
    state.records.unshift({ ...record, id: crypto.randomUUID() });
    if (!item.last_maintenance_on || item.last_maintenance_on < data.performed_on) item.last_maintenance_on = data.performed_on;
    if (data.status_after) item.status = data.status_after;
    demoSave();
  }
  state.modal = null; notify('تم تسجيل عملية الصيانة');
}
async function login(form) {
  const data = Object.fromEntries(new FormData(form));
  const { error } = await db.auth.signInWithPassword({ email: data.email, password: data.password });
  if (error) throw error;
  state.modal = null; await load();
  if (!state.admin) notify('تم الدخول، لكن هذا الحساب غير مضاف لمسؤولي الصيانة.'); else notify('تم الدخول بنجاح');
}

document.addEventListener('click', async (event) => {
  const actionEl = event.target.closest('[data-action]');
  if (actionEl) {
    const action = actionEl.dataset.action; const slug = actionEl.dataset.slug;
    if (action === 'close-modal' && (event.target === actionEl || actionEl.tagName === 'BUTTON')) { state.modal = null; render(); }
    if (action === 'login') { state.modal = { kind: 'login' }; render(); }
    if (action === 'add-equipment') { state.modal = { kind: 'equipment' }; render(); }
    if (action === 'edit-equipment') { state.modal = { kind: 'equipment', slug }; render(); }
    if (action === 'status') { state.modal = { kind: 'status', slug }; render(); }
    if (action === 'maintenance') { state.modal = { kind: 'maintenance', slug }; render(); }
    if (action === 'retry') load();
    if (action === 'logout') { await db.auth.signOut(); await load(); }
    if (action === 'download-qr') { const a = document.createElement('a'); a.href = document.querySelector('#qr-canvas').toDataURL('image/png'); a.download = `${slug}-qr.png`; a.click(); }
    if (action === 'print-qr') window.print();
    return;
  }
  const tab = event.target.closest('[data-filter]');
  if (tab) { state.filter = tab.dataset.filter; render(); return; }
  const link = event.target.closest('[data-filter-link]');
  if (link) { state.filter = link.dataset.filterLink; state.search = ''; setTimeout(render, 0); return; }
  const row = event.target.closest('tr[data-href]');
  if (row) location.hash = row.dataset.href;
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.modal) { state.modal = null; render(); } if (event.key === 'Enter' && event.target.matches('tr[data-href]')) location.hash = event.target.dataset.href; });
document.addEventListener('input', (event) => { if (event.target.id === 'search') { const pos = event.target.selectionStart; state.search = event.target.value; render(); const search = document.querySelector('#search'); search?.focus(); search?.setSelectionRange(pos, pos); } });
document.addEventListener('submit', async (event) => {
  if (!['login-form', 'equipment-form', 'status-form', 'maintenance-form'].includes(event.target.id)) return;
  event.preventDefault(); const button = event.target.querySelector('button[type="submit"], button:not([type])'); if (button) button.disabled = true;
  try {
    if (event.target.id === 'login-form') await login(event.target);
    if (event.target.id === 'equipment-form') await saveEquipment(event.target);
    if (event.target.id === 'status-form') await saveStatus(event.target);
    if (event.target.id === 'maintenance-form') await saveMaintenance(event.target);
  } catch (error) { fail(error.message || 'تعذر حفظ البيانات.'); if (button) button.disabled = false; }
});
window.addEventListener('hashchange', render);
load();
