import { useEffect, useRef, useState } from 'react';
import type { Product, Category } from '../../types';
import * as productService from '../../services/productService';
import * as categoryService from '../../services/categoryService';
import * as uploadService from '../../services/uploadService';
import { resolveImageUrl } from '../../services/uploadService';
import { useToast } from '../../context/ToastContext';
import { Modal, ConfirmModal } from '../../components/Modal';
import { PageLoading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';

const emptyForm = {
  id: 0,
  category_id: 0,
  name: '',
  description: '',
  price: '',
  image_url: '',
  stock: '',
  available: true,
  active: true,
};

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { notify } = useToast();

  function load() {
    setLoading(true);
    Promise.all([productService.listProducts(), categoryService.listCategories()])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setForm({ ...emptyForm, category_id: categories[0]?.id || 0 });
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setForm({
      id: p.id,
      category_id: p.category_id,
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      image_url: p.image_url || '',
      stock: p.stock === null ? '' : String(p.stock),
      available: p.available,
      active: p.active,
    });
    setModalOpen(true);
  }

  async function handleImageSelect(file: File) {
    setUploadingImage(true);
    try {
      const image = await uploadService.uploadImage(file, { entity_type: 'product' });
      setForm((f) => ({ ...f, image_url: image.url }));
      notify('Imagen subida.', 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo subir la imagen.', 'error');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category_id || form.price === '') {
      notify('Nombre, categoría y precio son obligatorios.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      category_id: Number(form.category_id),
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      image_url: form.image_url || null,
      stock: form.stock === '' ? null : Number(form.stock),
      available: form.available,
      active: form.active,
    };
    try {
      if (form.id) {
        await productService.updateProduct(form.id, payload);
        notify('Producto actualizado.', 'success');
      } else {
        await productService.createProduct(payload);
        notify('Producto creado.', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo guardar el producto.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvailable(p: Product) {
    try {
      await productService.updateProduct(p.id, { available: !p.available });
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo actualizar.', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await productService.deleteProduct(deleteTarget.id);
      notify('Producto eliminado.', 'success');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo eliminar. Prueba desactivarlo en su lugar.', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl">Productos</h1>
        <button className="btn-primary" onClick={openCreate}>+ Nuevo producto</button>
      </div>

      {loading ? (
        <PageLoading />
      ) : products.length === 0 ? (
        <EmptyState title="Sin productos" description="Crea el primer producto del menú." action={<button className="btn-primary" onClick={openCreate}>+ Nuevo producto</button>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-charcoal/50 border-b border-espresso/10">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Disponible</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-espresso/5 last:border-0">
                  <td className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-almond overflow-hidden shrink-0">
                      {p.image_url && <img src={resolveImageUrl(p.image_url)} alt="" className="w-full h-full object-cover" />}
                    </div>
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-charcoal/60">{p.category_name}</td>
                  <td className="px-4 py-3 font-mono">Bs {Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-charcoal/60">{p.stock === null ? '—' : p.stock}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleAvailable(p)}
                      className={`badge ${p.available ? 'bg-olive/10 text-olive' : 'bg-rose/10 text-rose'}`}
                    >
                      {p.available ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.active ? 'bg-almond text-espresso' : 'bg-charcoal/10 text-charcoal/50'}`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button className="text-gold-dark font-medium hover:underline" onClick={() => openEdit(p)}>Editar</button>
                    <button className="text-rose font-medium hover:underline" onClick={() => setDeleteTarget(p)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar producto' : 'Nuevo producto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-almond overflow-hidden shrink-0">
              {form.image_url && <img src={resolveImageUrl(form.image_url)} alt="" className="w-full h-full object-cover" />}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
              />
              <button type="button" className="btn-outline !py-2 text-xs" disabled={uploadingImage} onClick={() => fileRef.current?.click()}>
                {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
              </button>
              <p className="text-xs text-charcoal/40 mt-1">JPG, PNG o WEBP. Máx. 5MB.</p>
            </div>
          </div>

          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Precio (Bs)</label>
              <input type="number" step="0.01" min="0" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Stock (vacío = ilimitado)</label>
              <input type="number" min="0" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="flex items-end gap-4 pb-2.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                Disponible
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Activo
              </label>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar producto'}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar producto"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.name}"? Si prefieres solo ocultarlo del menú, desactívalo en vez de eliminarlo.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
