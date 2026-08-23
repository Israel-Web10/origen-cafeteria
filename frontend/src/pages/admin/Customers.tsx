import { useEffect, useState } from 'react';
import type { User } from '../../types';
import * as userService from '../../services/userService';
import type { OrderSummary } from '../../services/userService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/Modal';
import { PageLoading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';

export function AdminCustomers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    userService.listUsers('client').then(setUsers).finally(() => setLoading(false));
  }, []);

  async function openDetail(user: User) {
    setSelected(user);
    setLoadingDetail(true);
    try {
      const data = await userService.getUser(user.id);
      setOrders(data.orders);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function toggleActive(user: User) {
    try {
      const updated = await userService.updateUser(user.id, { active: !user.active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      notify(updated.active ? 'Cuenta activada.' : 'Cuenta desactivada.', 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo actualizar.', 'error');
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <h1 className="text-3xl mb-6">Clientes</h1>

      {users.length === 0 ? (
        <EmptyState title="Sin clientes registrados" description="Los clientes que se registren aparecerán aquí." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-charcoal/50 border-b border-espresso/10">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-espresso/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-espresso">{u.name}</td>
                  <td className="px-4 py-3 text-charcoal/60">{u.email}</td>
                  <td className="px-4 py-3 text-charcoal/60">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u)}
                      className={`badge ${u.active ? 'bg-olive/10 text-olive' : 'bg-rose/10 text-rose'}`}
                    >
                      {u.active ? 'Activo' : 'Suspendido'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-gold-dark font-medium hover:underline" onClick={() => openDetail(u)}>
                      Ver historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Historial de ${selected.name}` : ''}>
        {loadingDetail ? (
          <PageLoading />
        ) : orders.length === 0 ? (
          <p className="text-sm text-charcoal/50">Este cliente aún no tiene pedidos.</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {orders.map((o) => (
              <li key={o.id} className="flex justify-between text-sm border-b border-espresso/5 pb-2">
                <span className="font-mono">{o.order_number}</span>
                <span className="text-charcoal/50">{new Date(o.created_at).toLocaleDateString('es-BO')}</span>
                <span className="font-mono font-medium">Bs {Number(o.total).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
