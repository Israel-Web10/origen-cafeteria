import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Category, Translations } from '../../types';
import * as catalog from '../../services/catalogService';
import { uploadImage } from '../../services/contentService';
import { assetUrl, errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal, ConfirmModal } from '../../components/Modal';
import { Field, PageHeader, Toggle, TranslationFields } from '../ui';

export function Categories() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const load = useCallback(() => { catalog.listCategories(true).then(setItems).catch((e) => notify(errorMessage(e), 'error')); }, [notify]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing?.name?.trim()) return;
    const payload = { name: editing.name.trim(), description: editing.description || null, display_order: Number(editing.display_order) || 0, active: editing.active ?? true, translations: (editing.translations || {}) as Translations, image_url: editing.image_url || null };
    try {
      if (editing.id) await catalog.updateCategory(editing.id, payload); else await catalog.createCategory(payload);
      setEditing(null); load(); notify(t('common.saved'), 'success');
    } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function upload(file: File) {
    try { const img = await uploadImage(file, { entity_type: 'category', entity_id: editing?.id }); setEditing((c) => ({ ...c, image_url: img.url })); }
    catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function remove() {
    try { await catalog.deleteCategory(deleting!.id); setDeleting(null); load(); } catch (e) { notify(errorMessage(e), 'error'); setDeleting(null); }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={t('admin.nav.categories')} actions={<button className="btn-primary" onClick={() => setEditing({ active: true, display_order: items.length + 1, translations: {} })}>+ {t('admin.categories.new')}</button>} />
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>#</th><th>{t('admin.fields.name')}</th><th>EN / FR</th><th>{t('admin.categories.products')}</th><th>{t('admin.fields.status')}</th><th></th></tr></thead>
          <tbody>{items.map((c) => (
            <tr key={c.id} className={!c.active ? 'opacity-50' : ''}>
              <td>{c.display_order}</td>
              <td className="font-medium">{c.name}<span className="block text-xs text-charcoal/50">/{c.slug}</span></td>
              <td className="text-xs text-charcoal/60">{c.translations?.en?.name || '—'} / {c.translations?.fr?.name || '—'}</td>
              <td>{c.product_count}</td>
              <td>{c.active ? t('admin.active') : t('admin.inactive')}</td>
              <td className="text-right whitespace-nowrap"><button className="btn-ghost btn-sm" onClick={() => setEditing(c)}>{t('common.edit')}</button><button className="btn-ghost btn-sm text-rose" onClick={() => setDeleting(c)}>{t('common.delete')}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? t('common.edit') : t('admin.categories.new')}>
          <div className="space-y-4">
            <Field label={`${t('admin.fields.name')} (ES) *`}><input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label={`${t('admin.fields.description')} (ES)`}><textarea className="input" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <Field label={t('admin.fields.order')}><input type="number" className="input" value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} /></Field>
            <Toggle checked={editing.active ?? true} onChange={(v) => setEditing({ ...editing, active: v })} label={t('admin.active')} />
            <TranslationFields value={editing.translations || {}} onChange={(v) => setEditing({ ...editing, translations: v })} />
            <div>
              <span className="label">{t('admin.products.tabImage')}</span>
              {editing.image_url && <img src={assetUrl(editing.image_url)} alt="" className="w-32 h-32 object-cover rounded-lg mb-2" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></div>
        </Modal>
      )}
      <ConfirmModal open={!!deleting} danger title={t('admin.categories.deleteTitle')} description={t('admin.categories.deleteText')} onConfirm={remove} onCancel={() => setDeleting(null)} />
    </div>
  );
}
