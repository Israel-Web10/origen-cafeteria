import { useEffect, useState } from 'react';
import type { Category } from '../../types';
import * as categoryService from '../../services/categoryService';
import { useToast } from '../../context/ToastContext';
import { Modal, ConfirmModal } from '../../components/Modal';
import { PageLoading } from '../../components/Loading';

const emptyForm = { id: 0, name: '', description: '', display_order: 0, active: true };

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const { notify } = useToast();

  function load() {
    setLoading(true);
    categoryService.listCategories().then(setCategories).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setForm({ ...emptyForm, display_order: categories.length });
    setModalOpen(true);
  }

  function openEdit(c: Category) {
    setForm({ id: c.id, name: c.name, description: c.description || '', display_order: c.display_order, active: c.active });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return notify('El nombre es obligatorio.', 'error');
    setSaving(true);
    try {
      if (form.id) {
        await categoryService.updateCategory(form.id, form);
        notify('Categoría actualizada.', 'success');
      } else {
        await categoryService.createCategory(form);
        notify('Categoría creada.', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo guardar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await categoryService.deleteCategory(deleteTarget.id);
      notify('Categoría eliminada.', 'success');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo eliminar. Si tiene productos asociados, desactívala en su lugar.', 'error');
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl">Categorías</h1>
        <button className="btn-primary" onClick={openCreate}>+ Nueva categoría</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-charcoal/50 border-b border-espresso/10">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Orden</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-espresso/5 last:border-0">
                <td className="px-4 py-3 font-medium text-espresso">{c.name}</td>
                <td className="px-4 py-3 text-charcoal/60">{c.description}</td>
                <td className="px-4 py-3 text-charcoal/60">{c.display_order}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.active ? 'bg-olive/10 text-olive' : 'bg-charcoal/10 text-charcoal/50'}`}>
                    {c.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button className="text-gold-dark font-medium hover:underline" onClick={() => openEdit(c)}>Editar</button>
                  <button className="text-rose font-medium hover:underline" onClick={() => setDeleteTarget(c)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar categoría' : 'Nueva categoría'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Orden</label>
              <input type="number" className="input" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-sm self-end pb-2.5">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Activa
            </label>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar categoría'}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar categoría"
        description={`¿Eliminar "${deleteTarget?.name}"? Si tiene productos asociados no se podrá eliminar; desactívala en su lugar.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
