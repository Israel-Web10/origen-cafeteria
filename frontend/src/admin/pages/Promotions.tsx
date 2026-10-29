import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Category, Product, Promotion } from '../../types';
import * as catalog from '../../services/catalogService';
import { errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import { formatDate, parseMoneyInput } from '../../lib/format';
import { Modal } from '../../components/Modal';
import { Field, PageHeader, Toggle } from '../ui';

// <input type="datetime-local"> trabaja en hora local del navegador
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function PromotionsAdmin() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const { money } = useConfig();
  const [items, setItems] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<(Partial<Promotion> & { target?: 'product' | 'category'; valueInput?: string; en?: string; fr?: string }) | null>(null);

  const load = useCallback(() => { catalog.listPromotions(true).then(setItems).catch((e) => notify(errorMessage(e), 'error')); }, [notify]);
  useEffect(() => {
    load();
    catalog.listProducts({ include_inactive: true, limit: 200, sort: 'name' }).then(setProducts).catch(() => {});
    catalog.listCategories(true).then(setCategories).catch(() => {});
  }, [load]);

  async function save() {
    if (!editing) return;
    const value = editing.kind === 'fixed' ? parseMoneyInput(editing.valueInput || '') : Number(editing.valueInput);
    if (!editing.name || !value || !editing.starts_at || !editing.ends_at) { notify(t('admin.promos.invalid'), 'error'); return; }
    try {
      await catalog.savePromotion(editing.id ?? null, {
        name: editing.name, description: editing.description || null, kind: editing.kind, value,
        product_id: editing.target === 'product' ? editing.product_id : null, category_id: editing.target === 'category' ? editing.category_id : null,
        starts_at: new Date(editing.starts_at).toISOString(), ends_at: new Date(editing.ends_at).toISOString(), active: editing.active ?? true,
        translations: { en: editing.en ? { name: editing.en } : undefined, fr: editing.fr ? { name: editing.fr } : undefined },
      });
      setEditing(null); load(); notify(t('common.saved'), 'success');
    } catch (e) { notify(errorMessage(e), 'error'); }
  }

  const now = new Date();
  const week = new Date(Date.now() + 7 * 86400000);
  return (
    <div className="max-w-5xl">
      <PageHeader title={t('admin.nav.promotions')} subtitle={t('admin.promos.subtitle')}
        actions={<button className="btn-primary" onClick={() => setEditing({ kind: 'percent', target: 'product', active: true, starts_at: toLocalInput(now.toISOString()), ends_at: toLocalInput(week.toISOString()) })}>+ {t('admin.promos.new')}</button>} />
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>{t('admin.fields.name')}</th><th>{t('admin.promos.discount')}</th><th>{t('admin.promos.appliesTo')}</th><th>{t('admin.promos.window')}</th><th>{t('admin.fields.status')}</th><th></th></tr></thead>
          <tbody>{items.map((p) => (
            <tr key={p.id}>
              <td className="font-medium">{p.name}</td>
              <td>{p.kind === 'percent' ? `${p.value}%` : money(p.value)}</td>
              <td>{p.product_name || p.category_name}</td>
              <td className="text-xs">{formatDate(p.starts_at, i18n.language, { dateStyle: 'short', timeStyle: 'short' })} → {formatDate(p.ends_at, i18n.language, { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td>{p.running ? <span className="badge bg-olive/15 text-olive">{t('admin.promos.running')}</span> : p.active ? t('admin.promos.scheduled') : t('admin.inactive')}</td>
              <td><button className="btn-ghost btn-sm" onClick={() => setEditing({ ...p, target: p.product_id ? 'product' : 'category', valueInput: p.kind === 'fixed' ? (p.value / 100).toFixed(2) : String(p.value), starts_at: toLocalInput(p.starts_at), ends_at: toLocalInput(p.ends_at), en: p.translations?.en?.name, fr: p.translations?.fr?.name })}>{t('common.edit')}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? t('common.edit') : t('admin.promos.new')}>
          <div className="grid gap-4">
            <Field label={`${t('admin.fields.name')} *`}><input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.promos.kind')}><select className="input" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as 'percent' | 'fixed' })}><option value="percent">%</option><option value="fixed">{t('admin.promos.fixed')}</option></select></Field>
              <Field label={t('admin.promos.discount')} hint={editing.kind === 'percent' ? t('admin.promos.percentHint') : t('admin.promos.fixedHint')}><input className="input" inputMode="decimal" value={editing.valueInput || ''} onChange={(e) => setEditing({ ...editing, valueInput: e.target.value })} /></Field>
            </div>
            <Field label={t('admin.promos.appliesTo')}>
              <div className="flex gap-2 mb-2">{(['product', 'category'] as const).map((k) => <button type="button" key={k} className={`chip ${editing.target === k ? 'chip-on' : 'chip-off'}`} onClick={() => setEditing({ ...editing, target: k })}>{t(`admin.fields.${k}`)}</button>)}</div>
              {editing.target === 'product'
                ? <select className="input" value={editing.product_id ?? ''} onChange={(e) => setEditing({ ...editing, product_id: Number(e.target.value) })}><option value="">—</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                : <select className="input" value={editing.category_id ?? ''} onChange={(e) => setEditing({ ...editing, category_id: Number(e.target.value) })}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.promos.start')}><input type="datetime-local" className="input" value={editing.starts_at || ''} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} /></Field>
              <Field label={t('admin.promos.end')}><input type="datetime-local" className="input" value={editing.ends_at || ''} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t('admin.fields.name')} (EN)`}><input className="input" value={editing.en || ''} onChange={(e) => setEditing({ ...editing, en: e.target.value })} /></Field>
              <Field label={`${t('admin.fields.name')} (FR)`}><input className="input" value={editing.fr || ''} onChange={(e) => setEditing({ ...editing, fr: e.target.value })} /></Field>
            </div>
            <Toggle checked={editing.active ?? true} onChange={(v) => setEditing({ ...editing, active: v })} label={t('admin.active')} />
          </div>
          <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></div>
        </Modal>
      )}
    </div>
  );
}
