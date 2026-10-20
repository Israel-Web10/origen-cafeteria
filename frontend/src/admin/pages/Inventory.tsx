import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { InventoryItem, Product, StockMovement, Supplier } from '../../types';
import * as admin from '../../services/adminService';
import * as catalog from '../../services/catalogService';
import { errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import { formatDate, formatNumber, parseMoneyInput } from '../../lib/format';
import { Modal } from '../../components/Modal';
import { PageLoading } from '../../components/Loading';
import { Field, PageHeader, Pagination, Tabs, Toggle } from '../ui';

type Tab = 'items' | 'movements' | 'alerts' | 'suppliers';
const UNITS = ['g', 'kg', 'ml', 'l', 'unidad'] as const;

export function Inventory() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('items');
  const [movementOpen, setMovementOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div>
      <PageHeader title={t('admin.nav.inventory')} subtitle={t('admin.inventory.subtitle')} actions={<button className="btn-primary" onClick={() => setMovementOpen(true)}>+ {t('admin.inventory.newMovement')}</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'items', label: t('admin.inventory.items') }, { id: 'movements', label: t('admin.inventory.movements') },
        { id: 'alerts', label: t('admin.inventory.alerts') }, { id: 'suppliers', label: t('admin.inventory.suppliers') },
      ]} />
      {tab === 'items' && <Items key={refreshKey} />}
      {tab === 'movements' && <Movements key={refreshKey} />}
      {tab === 'alerts' && <Alerts key={refreshKey} />}
      {tab === 'suppliers' && <Suppliers />}
      {movementOpen && <MovementForm onClose={() => setMovementOpen(false)} onSaved={() => { setMovementOpen(false); setRefreshKey((k) => k + 1); }} />}
    </div>
  );
}

function Items() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const { money } = useConfig();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Partial<InventoryItem> | null>(null);
  const load = useCallback(() => { admin.listItems(true).then(setItems).catch((e) => notify(errorMessage(e), 'error')); }, [notify]);
  useEffect(() => { load(); admin.listSuppliers().then(setSuppliers).catch(() => {}); }, [load]);

  async function save() {
    if (!editing?.name || !editing.unit) return;
    try {
      await admin.saveItem(editing.id ?? null, {
        name: editing.name, unit: editing.unit, min_quantity: Number(editing.min_quantity || 0), supplier_id: editing.supplier_id || null,
        tracks_expiry: !!editing.tracks_expiry, active: editing.active ?? true,
      });
      setEditing(null); load(); notify(t('common.saved'), 'success');
    } catch (e) { notify(errorMessage(e), 'error'); }
  }

  if (!items) return <PageLoading />;
  return (
    <>
      <div className="flex justify-end mb-3"><button className="btn-outline btn-sm" onClick={() => setEditing({ unit: 'g', active: true, min_quantity: '0' })}>+ {t('admin.inventory.newItem')}</button></div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>{t('admin.inventory.item')}</th><th className="text-right">{t('admin.inventory.onHand')}</th><th className="text-right">{t('admin.inventory.min')}</th><th className="text-right">{t('admin.inventory.avgCost')}</th><th>{t('admin.inventory.supplier')}</th><th>{t('admin.inventory.usedIn')}</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-charcoal/50">{t('admin.inventory.emptyItems')}</td></tr>}
            {items.map((it) => (
              <tr key={it.id} className={!it.active ? 'opacity-50' : ''}>
                <td className="font-medium">{it.low && <span className="text-rose" title={t('admin.inventory.low')}>⚠ </span>}{it.name}</td>
                <td className={`text-right font-mono ${it.low ? 'text-rose font-semibold' : ''}`}>{formatNumber(Number(it.quantity), i18n.language, 3)} {it.unit}</td>
                <td className="text-right font-mono text-charcoal/60">{formatNumber(Number(it.min_quantity), i18n.language, 3)}</td>
                <td className="text-right font-mono text-charcoal/60">{it.cost_per_unit_cents ? `${money(Math.round(Number(it.cost_per_unit_cents) * 1000))}/1000 ${it.unit}` : '—'}</td>
                <td>{it.supplier_name || '—'}</td>
                <td>{it.used_in}</td>
                <td><button className="btn-ghost btn-sm" onClick={() => setEditing(it)}>{t('common.edit')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-charcoal/50 mt-3">{t('admin.inventory.itemsHelp')}</p>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? t('common.edit') : t('admin.inventory.newItem')}>
          <div className="grid gap-4">
            <Field label={`${t('admin.fields.name')} *`}><input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.inventory.unit')} hint={editing.id ? t('admin.inventory.unitLocked') : undefined}>
                <select className="input" value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value as InventoryItem['unit'] })}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
              </Field>
              <Field label={t('admin.inventory.min')}><input className="input" inputMode="decimal" value={editing.min_quantity || ''} onChange={(e) => setEditing({ ...editing, min_quantity: e.target.value })} /></Field>
            </div>
            <Field label={t('admin.inventory.supplier')}>
              <select className="input" value={editing.supplier_id ?? ''} onChange={(e) => setEditing({ ...editing, supplier_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Toggle checked={!!editing.tracks_expiry} onChange={(v) => setEditing({ ...editing, tracks_expiry: v })} label={t('admin.inventory.tracksExpiry')} />
            <Toggle checked={editing.active ?? true} onChange={(v) => setEditing({ ...editing, active: v })} label={t('admin.active')} />
            {!editing.id && <p className="text-xs text-charcoal/50">{t('admin.inventory.initialViaEntry')}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></div>
        </Modal>
      )}
    </>
  );
}

const LIMIT = 50;
function Movements() {
  const { t, i18n } = useTranslation();
  const { settings } = useConfig();
  const [type, setType] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ movements: StockMovement[]; total: number } | null>(null);
  useEffect(() => { admin.listMovements({ type: type || undefined, limit: LIMIT, offset }).then(setData).catch(() => setData({ movements: [], total: 0 })); }, [type, offset]);
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        {['', 'entrada', 'venta', 'ajuste', 'merma', 'anulacion_venta', 'devolucion'].map((k) => (
          <button key={k || 'all'} className={`chip ${type === k ? 'chip-on' : 'chip-off'}`} onClick={() => { setOffset(0); setType(k); }}>{k ? t(`admin.inventory.types.${k}`) : t('menu.all')}</button>
        ))}
      </div>
      {!data ? <PageLoading /> : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>{t('admin.orders.date')}</th><th>{t('admin.inventory.item')}</th><th>{t('admin.inventory.type')}</th><th className="text-right">{t('admin.inventory.quantity')}</th><th className="text-right">{t('admin.inventory.balance')}</th><th>{t('admin.payments.reason')}</th><th>{t('admin.inventory.user')}</th></tr></thead>
            <tbody>{data.movements.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap text-xs">{formatDate(m.created_at, i18n.language, { dateStyle: 'short', timeStyle: 'short' }, settings.timezone)}</td>
                <td>{m.item_name || m.product_name}</td>
                <td>{t(`admin.inventory.types.${m.type}`)}</td>
                <td className={`text-right font-mono ${Number(m.quantity_delta) < 0 ? 'text-rose' : 'text-olive'}`}>{Number(m.quantity_delta) > 0 ? '+' : ''}{formatNumber(Number(m.quantity_delta), i18n.language, 3)} {m.unit || 'u'}</td>
                <td className="text-right font-mono">{formatNumber(Number(m.balance_after), i18n.language, 3)}</td>
                <td className="text-xs">{m.reason}{m.order_number ? ` · ${m.order_number}` : ''}{m.expires_at ? ` · ⌛ ${m.expires_at}` : ''}</td>
                <td className="text-xs">{m.user_name || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && <Pagination total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />}
      <p className="text-xs text-charcoal/50 mt-3">{t('admin.inventory.immutable')}</p>
    </>
  );
}

function Alerts() {
  const { t } = useTranslation();
  const [data, setData] = useState<Awaited<ReturnType<typeof admin.alerts>> | null>(null);
  useEffect(() => { admin.alerts(14).then(setData).catch(() => {}); }, []);
  if (!data) return <PageLoading />;
  const none = !data.lowStock.items.length && !data.lowStock.products.length && !data.expiring.length;
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {none && <p className="card p-6 text-olive lg:col-span-2">✓ {t('admin.inventory.noAlerts')}</p>}
      {(data.lowStock.items.length > 0 || data.lowStock.products.length > 0) && (
        <section className="card p-5">
          <h2 className="text-xl mb-3">{t('admin.inventory.reorder')}</h2>
          <ul className="divide-y divide-espresso/10 text-sm">
            {data.lowStock.items.map((i) => <li key={`i${i.id}`} className="py-2 flex justify-between"><span>⚠ {i.name}</span><span className="font-mono">{Number(i.quantity)} / {Number(i.min_quantity)} {i.unit}</span></li>)}
            {data.lowStock.products.map((p) => <li key={`p${p.id}`} className="py-2 flex justify-between"><span>⚠ {p.name}</span><span className="font-mono">{p.stock} / {p.low_stock_threshold} u</span></li>)}
          </ul>
        </section>
      )}
      {data.expiring.length > 0 && (
        <section className="card p-5">
          <h2 className="text-xl mb-1">{t('admin.inventory.expiring')}</h2>
          <p className="text-xs text-charcoal/50 mb-3">{t('admin.inventory.expiringHelp')}</p>
          <ul className="divide-y divide-espresso/10 text-sm">{data.expiring.map((e) => <li key={e.id} className="py-2 flex justify-between"><span>{e.name}</span><span>⌛ {e.expires_at}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}

function Suppliers() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [items, setItems] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const load = useCallback(() => { admin.listSuppliers().then(setItems).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  async function save() {
    if (!editing?.name) return;
    try { await admin.saveSupplier(editing.id ?? null, { name: editing.name, contact: editing.contact, phone: editing.phone, email: editing.email || '', notes: editing.notes, active: editing.active ?? true }); setEditing(null); load(); }
    catch (e) { notify(errorMessage(e), 'error'); }
  }
  return (
    <>
      <div className="flex justify-end mb-3"><button className="btn-outline btn-sm" onClick={() => setEditing({ active: true })}>+ {t('admin.inventory.newSupplier')}</button></div>
      <div className="card overflow-x-auto"><table className="table-base">
        <thead><tr><th>{t('admin.fields.name')}</th><th>{t('admin.inventory.contact')}</th><th>{t('checkout.phone')}</th><th>Email</th><th></th></tr></thead>
        <tbody>{items.map((s) => <tr key={s.id} className={!s.active ? 'opacity-50' : ''}><td>{s.name}</td><td>{s.contact}</td><td>{s.phone}</td><td>{s.email}</td><td><button className="btn-ghost btn-sm" onClick={() => setEditing(s)}>{t('common.edit')}</button></td></tr>)}</tbody>
      </table></div>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? t('common.edit') : t('admin.inventory.newSupplier')}>
          <div className="grid gap-3">
            {(['name', 'contact', 'phone', 'email', 'notes'] as const).map((k) => (
              <Field key={k} label={t(`admin.inventory.supplierFields.${k}`)}><input className="input" value={(editing[k] as string) || ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></Field>
            ))}
            <Toggle checked={editing.active ?? true} onChange={(v) => setEditing({ ...editing, active: v })} label={t('admin.active')} />
          </div>
          <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></div>
        </Modal>
      )}
    </>
  );
}

function MovementForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [f, setF] = useState({ target: 'item' as 'item' | 'product', id: 0, type: 'entrada' as 'entrada' | 'ajuste' | 'merma' | 'devolucion', quantity: '', cost: '', reason: '', supplier_id: '', expires_at: '' });
  useEffect(() => {
    admin.listItems().then(setItems).catch(() => {});
    catalog.listProducts({ include_inactive: true, limit: 200 }).then((p) => setProducts(p.filter((x) => x.stock !== null))).catch(() => {});
    admin.listSuppliers().then(setSuppliers).catch(() => {});
  }, []);
  const options = f.target === 'item' ? items.map((i) => ({ id: i.id, label: `${i.name} (${Number(i.quantity)} ${i.unit})`, unit: i.unit })) : products.map((p) => ({ id: p.id, label: `${p.name} (${p.stock} u)`, unit: 'u' }));
  const unit = options.find((o) => o.id === f.id)?.unit;

  async function save() {
    if (!f.id || !f.quantity) { notify(t('admin.inventory.invalid'), 'error'); return; }
    const costCents = f.cost ? parseMoneyInput(f.cost) : undefined;
    try {
      await admin.recordMovement({
        target: f.target, id: f.id, type: f.type,
        ...(f.type === 'ajuste' ? { counted_quantity: Number(f.quantity.replace(',', '.')) } : { quantity: Number(f.quantity.replace(',', '.')) }),
        // costo por UNIDAD del insumo; se ingresa por la cantidad total comprada
        unit_cost_cents: f.type === 'entrada' && costCents ? costCents / Number(f.quantity.replace(',', '.')) : undefined,
        reason: f.reason || undefined, supplier_id: f.supplier_id ? Number(f.supplier_id) : null, expires_at: f.expires_at || null,
      });
      notify(t('common.saved'), 'success'); onSaved();
    } catch (e) { notify(errorMessage(e), 'error'); }
  }

  return (
    <Modal open onClose={onClose} title={t('admin.inventory.newMovement')}>
      <div className="grid gap-4">
        <div className="flex gap-2">{(['item', 'product'] as const).map((k) => <button key={k} type="button" className={`chip ${f.target === k ? 'chip-on' : 'chip-off'}`} onClick={() => setF({ ...f, target: k, id: 0 })}>{t(`admin.inventory.target.${k}`)}</button>)}</div>
        <Field label={t('admin.inventory.item')}><select className="input" value={f.id || ''} onChange={(e) => setF({ ...f, id: Number(e.target.value) })}><option value="">—</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>
        <Field label={t('admin.inventory.type')}>
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as typeof f.type })}>
            {(['entrada', 'ajuste', 'merma', 'devolucion'] as const).map((k) => <option key={k} value={k}>{t(`admin.inventory.types.${k}`)}</option>)}
          </select>
        </Field>
        <Field label={f.type === 'ajuste' ? t('admin.inventory.counted', { unit }) : t('admin.inventory.quantityUnit', { unit })} hint={f.type === 'ajuste' ? t('admin.inventory.countedHint') : undefined}>
          <input className="input" inputMode="decimal" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        </Field>
        {f.type === 'entrada' && (
          <>
            <Field label={t('admin.inventory.totalCost')} hint={t('admin.inventory.totalCostHint')}><input className="input" inputMode="decimal" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field>
            <Field label={t('admin.inventory.supplier')}><select className="input" value={f.supplier_id} onChange={(e) => setF({ ...f, supplier_id: e.target.value })}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label={t('admin.inventory.expires')}><input type="date" className="input" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></Field>
          </>
        )}
        <Field label={`${t('admin.payments.reason')}${['ajuste', 'merma'].includes(f.type) ? ' *' : ''}`}><input className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={300} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></div>
    </Modal>
  );
}
