import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Category, InventoryItem, Product, Translations } from '../../types';
import * as catalog from '../../services/catalogService';
import { listItems } from '../../services/adminService';
import { uploadImage } from '../../services/contentService';
import { assetUrl, errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import { centsToInput, parseMoneyInput } from '../../lib/format';
import { Modal, ConfirmModal } from '../../components/Modal';
import { PageLoading } from '../../components/Loading';
import { Field, PageHeader, Tabs, Toggle, TranslationFields } from '../ui';

interface VariantForm { id?: number; name: string; delta: string; active: boolean }
interface ProductForm {
  id?: number; category_id: number | ''; name: string; description: string; ingredients: string; allergens: string;
  price: string; cost: string; prep: string; is_new: boolean; is_featured: boolean; available: boolean; active: boolean;
  track_stock: boolean; low_stock_threshold: string; tags: string; translations: Translations; variants: VariantForm[]; image_url: string | null;
}

const empty = (categoryId: number | ''): ProductForm => ({
  category_id: categoryId, name: '', description: '', ingredients: '', allergens: '', price: '', cost: '', prep: '',
  is_new: false, is_featured: false, available: true, active: true, track_stock: false, low_stock_threshold: '5',
  tags: '', translations: {}, variants: [], image_url: null,
});

export function Products() {
  const { t } = useTranslation();
  const { money } = useConfig();
  const { notify } = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    catalog.listProducts({ include_inactive: true, limit: 200, sort: 'name' }).then(setProducts).catch((e) => notify(errorMessage(e), 'error'));
    catalog.listCategories(true).then(setCategories).catch(() => {});
  }, [notify]);
  useEffect(() => { load(); }, [load]);

  async function remove() {
    if (!deleting) return;
    try {
      const r = await catalog.deleteProduct(deleting.id);
      notify(r.deactivated ? t('admin.products.deactivated') : t('admin.products.deleted'), 'success');
      setDeleting(null); load();
    } catch (e) { notify(errorMessage(e), 'error'); }
  }

  const filtered = (products || []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t('admin.nav.products')} subtitle={t('admin.products.subtitle')}
        actions={<button className="btn-primary" onClick={() => setEditing('new')} disabled={!categories.length}>+ {t('admin.products.new')}</button>} />
      {!categories.length && products && <p className="card p-4 mb-4 text-sm">{t('admin.products.needCategory')}</p>}
      <input className="input mb-4 max-w-sm" placeholder={t('menu.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
      {!products ? <PageLoading /> : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th></th><th>{t('admin.fields.name')}</th><th>{t('admin.fields.category')}</th><th className="text-right">{t('admin.fields.price')}</th><th className="text-right">{t('admin.fields.cost')}</th><th>{t('admin.fields.stock')}</th><th>{t('admin.fields.status')}</th><th></th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={!p.active ? 'opacity-50' : ''}>
                  <td>{p.image_url ? <img src={assetUrl(p.image_url)} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-almond" />}</td>
                  <td><p className="font-medium">{p.name}</p><p className="text-xs text-charcoal/50">{p.variants.filter((v) => v.active).length ? t('admin.products.variantsCount', { count: p.variants.filter((v) => v.active).length }) : ''} {p.promotion ? `· 🎁 ${p.promotion.name}` : ''}</p></td>
                  <td>{p.category_name}</td>
                  <td className="text-right font-mono">{money(p.price_cents)}</td>
                  <td className="text-right font-mono text-charcoal/60">{p.cost_cents != null ? money(p.cost_cents) : '—'}</td>
                  <td>{p.stock === null ? <span className="text-charcoal/50 text-xs">{t('admin.products.noStockControl')}</span> : <span className={p.stock <= (p.low_stock_threshold ?? 5) ? 'text-rose font-semibold' : ''}>{p.stock}</span>}
                    {p.max_by_ingredients != null && <span className="block text-[11px] text-charcoal/50">{t('admin.products.byIngredients', { count: p.max_by_ingredients })}</span>}</td>
                  <td>{!p.active ? t('admin.inactive') : !p.available ? t('product.unavailable') : t('admin.active')}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-ghost btn-sm" onClick={() => setEditing(p)}>{t('common.edit')}</button>
                    <button className="btn-ghost btn-sm" onClick={() => catalog.getProduct(p.id).then(setRecipeFor)}>{t('admin.products.recipe')}</button>
                    <button className="btn-ghost btn-sm text-rose" onClick={() => setDeleting(p)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <ProductEditor product={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {recipeFor && <RecipeEditor product={recipeFor} onClose={() => setRecipeFor(null)} onSaved={() => { setRecipeFor(null); load(); }} />}
      <ConfirmModal open={!!deleting} danger title={t('admin.products.deleteTitle')} description={t('admin.products.deleteText')} onConfirm={remove} onCancel={() => setDeleting(null)} />
    </div>
  );
}

function ProductEditor({ product, categories, onClose, onSaved }: { product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [tab, setTab] = useState<'main' | 'variants' | 'translations' | 'image'>('main');
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<ProductForm>(() => product ? {
    id: product.id, category_id: product.category_id, name: product.name, description: product.description || '', ingredients: product.ingredients || '',
    allergens: product.allergens || '', price: centsToInput(product.price_cents), cost: centsToInput(product.cost_cents), prep: product.prep_time_minutes ? String(product.prep_time_minutes) : '',
    is_new: product.is_new, is_featured: product.is_featured, available: product.available, active: product.active, track_stock: product.stock !== null,
    low_stock_threshold: String(product.low_stock_threshold ?? 5), tags: product.tags.join(', '), translations: product.translations || {},
    variants: product.variants.map((v) => ({ id: v.id, name: v.name, delta: (v.price_delta_cents / 100).toFixed(2), active: v.active })), image_url: product.image_url ?? null,
  } : empty(categories[0]?.id ?? ''));
  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    const price = parseMoneyInput(f.price);
    const cost = f.cost ? parseMoneyInput(f.cost) : null;
    if (!f.name.trim() || price === null || !f.category_id) { notify(t('admin.products.invalid'), 'error'); setTab('main'); return; }
    if (f.cost && cost === null) { notify(t('admin.products.invalidCost'), 'error'); return; }
    const variants = f.variants.filter((v) => v.name.trim()).map((v) => {
      const neg = v.delta.trim().startsWith('-');
      const cents = parseMoneyInput(v.delta.replace('-', '').replace('+', '') || '0') ?? 0;
      return { id: v.id, name: v.name.trim(), price_delta_cents: neg ? -cents : cents, active: v.active };
    });
    const payload: Record<string, unknown> = {
      category_id: Number(f.category_id), name: f.name.trim(), description: f.description, ingredients: f.ingredients, allergens: f.allergens,
      price_cents: price, cost_cents: cost, prep_time_minutes: f.prep ? Number(f.prep) : null, is_new: f.is_new, is_featured: f.is_featured,
      available: f.available, active: f.active, low_stock_threshold: Number(f.low_stock_threshold) || 0,
      tags: f.tags.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10), translations: f.translations, variants, image_url: f.image_url,
    };
    setSaving(true);
    try {
      if (product) await catalog.updateProduct(product.id, { ...payload, track_stock: f.track_stock });
      else await catalog.createProduct({ ...payload, stock: f.track_stock ? 0 : null });
      notify(t('common.saved'), 'success');
      onSaved();
    } catch (e) { notify(errorMessage(e), 'error'); } finally { setSaving(false); }
  }

  async function upload(file: File) {
    if (!product) { notify(t('admin.products.saveFirst'), 'info'); return; }
    try {
      const img = await uploadImage(file, { entity_type: 'product', entity_id: product.id, is_primary: true, alt_text: f.name });
      set('image_url', img.url);
      notify(t('admin.images.uploaded'), 'success');
    } catch (e) { notify(errorMessage(e), 'error'); }
  }

  return (
    <Modal open onClose={onClose} title={product ? t('admin.products.edit', { name: product.name }) : t('admin.products.new')} maxWidth="max-w-3xl">
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'main', label: t('admin.products.tabMain') }, { id: 'variants', label: t('admin.products.tabVariants') },
        { id: 'translations', label: t('admin.translations') }, { id: 'image', label: t('admin.products.tabImage') },
      ]} />
      {tab === 'main' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={`${t('admin.fields.name')} (ES) *`}><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={150} /></Field>
          <Field label={`${t('admin.fields.category')} *`}>
            <select className="input" value={f.category_id} onChange={(e) => set('category_id', Number(e.target.value))}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </Field>
          <div className="sm:col-span-2"><Field label={`${t('admin.fields.description')} (ES)`}><textarea className="input min-h-[70px]" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
          <Field label={`${t('admin.fields.price')} *`} hint={t('admin.products.priceHint')}><input className="input" inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="18.00" /></Field>
          <Field label={t('admin.fields.cost')} hint={t('admin.products.costHint')}><input className="input" inputMode="decimal" value={f.cost} onChange={(e) => set('cost', e.target.value)} /></Field>
          <Field label={t('admin.fields.ingredients')}><textarea className="input" value={f.ingredients} onChange={(e) => set('ingredients', e.target.value)} /></Field>
          <Field label={t('admin.fields.allergens')}><textarea className="input" value={f.allergens} onChange={(e) => set('allergens', e.target.value)} /></Field>
          <Field label={t('admin.fields.prep')}><input type="number" min={0} className="input" value={f.prep} onChange={(e) => set('prep', e.target.value)} /></Field>
          <Field label={t('admin.fields.tags')} hint={t('admin.products.tagsHint')}><input className="input" value={f.tags} onChange={(e) => set('tags', e.target.value)} /></Field>
          <div className="sm:col-span-2 flex flex-wrap gap-4 pt-2">
            <Toggle checked={f.active} onChange={(v) => set('active', v)} label={t('admin.active')} />
            <Toggle checked={f.available} onChange={(v) => set('available', v)} label={t('admin.products.available')} />
            <Toggle checked={f.is_featured} onChange={(v) => set('is_featured', v)} label={t('product.featured')} />
            <Toggle checked={f.is_new} onChange={(v) => set('is_new', v)} label={t('product.new')} />
            <Toggle checked={f.track_stock} onChange={(v) => set('track_stock', v)} label={t('admin.products.trackStock')} />
          </div>
          {f.track_stock && <Field label={t('admin.products.lowThreshold')} hint={t('admin.products.stockViaInventory')}><input type="number" min={0} className="input" value={f.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} /></Field>}
        </div>
      )}
      {tab === 'variants' && (
        <div>
          <p className="text-sm text-charcoal/60 mb-3">{t('admin.products.variantsHint')}</p>
          {f.variants.map((v, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input className="input" placeholder={t('admin.fields.name')} value={v.name} onChange={(e) => set('variants', f.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input !w-32" placeholder="+0.00" value={v.delta} onChange={(e) => set('variants', f.variants.map((x, j) => (j === i ? { ...x, delta: e.target.value } : x)))} aria-label={t('admin.products.delta')} />
              <Toggle checked={v.active} onChange={(val) => set('variants', f.variants.map((x, j) => (j === i ? { ...x, active: val } : x)))} label="" />
              {!v.id && <button className="text-rose px-2" onClick={() => set('variants', f.variants.filter((_, j) => j !== i))} aria-label={t('common.delete')}>✕</button>}
            </div>
          ))}
          <button className="btn-outline btn-sm" onClick={() => set('variants', [...f.variants, { name: '', delta: '0.00', active: true }])}>+ {t('admin.products.addVariant')}</button>
        </div>
      )}
      {tab === 'translations' && <TranslationFields value={f.translations} onChange={(v) => set('translations', v)} fields={['name', 'description', 'ingredients']} />}
      {tab === 'image' && (
        <div className="space-y-3">
          {f.image_url ? <img src={assetUrl(f.image_url)} alt="" className="w-48 h-48 object-cover rounded-xl" /> : <div className="w-48 h-48 rounded-xl bg-almond flex items-center justify-center text-xs text-charcoal/50">{t('product.noImage')}</div>}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={!product} />
          <p className="text-xs text-charcoal/50">{product ? t('admin.images.rules') : t('admin.products.saveFirst')}</p>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-espresso/10">
        <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </Modal>
  );
}

function RecipeEditor({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rows, setRows] = useState(() => (product.components || []).map((c) => ({ inventory_item_id: c.inventory_item_id, variant_id: c.variant_id, quantity: c.quantity })));
  useEffect(() => { listItems().then(setItems).catch(() => {}); }, []);

  async function save() {
    try {
      await catalog.setComponents(product.id, rows.filter((r) => r.inventory_item_id && Number(r.quantity) > 0).map((r) => ({ ...r, quantity: Number(r.quantity) })));
      notify(t('common.saved'), 'success'); onSaved();
    } catch (e) { notify(errorMessage(e), 'error'); }
  }

  return (
    <Modal open onClose={onClose} title={t('admin.products.recipeTitle', { name: product.name })} maxWidth="max-w-2xl">
      <p className="text-sm text-charcoal/60 mb-4">{t('admin.products.recipeHint')}</p>
      {items.length === 0 && <p className="text-sm text-rose mb-3">{t('admin.products.noItems')}</p>}
      {rows.map((r, i) => {
        const item = items.find((x) => x.id === r.inventory_item_id);
        return (
          <div key={i} className="grid grid-cols-[1fr_1fr_120px_auto] gap-2 mb-2 items-center">
            <select className="input" value={r.inventory_item_id || ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, inventory_item_id: Number(e.target.value) } : x)))}>
              <option value="">{t('admin.inventory.item')}</option>{items.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
            </select>
            <select className="input" value={r.variant_id ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, variant_id: e.target.value ? Number(e.target.value) : null } : x)))}>
              <option value="">{t('admin.products.allVariants')}</option>{product.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <input className="input" inputMode="decimal" value={r.quantity} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} aria-label={`${t('admin.inventory.quantity')} ${item?.unit || ''}`} placeholder={item?.unit} />
            <button className="text-rose px-2" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t('common.delete')}>✕</button>
          </div>
        );
      })}
      <button className="btn-outline btn-sm" onClick={() => setRows([...rows, { inventory_item_id: 0, variant_id: null, quantity: '' }])}>+ {t('admin.products.addComponent')}</button>
      <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></div>
    </Modal>
  );
}
