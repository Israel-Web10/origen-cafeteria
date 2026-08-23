import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Order, OrderStatus } from '../../types';
import { ORDER_STATUS_LABELS } from '../../types';
import * as orderService from '../../services/orderService';
import { PageLoading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';

const STATUS_OPTIONS: (OrderStatus | 'todos')[] = [
  'todos', 'pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado',
];

const statusColor: Record<OrderStatus, string> = {
  pendiente: 'bg-gold/10 text-gold-dark',
  confirmado: 'bg-olive/10 text-olive',
  en_preparacion: 'bg-gold/10 text-gold-dark',
  listo: 'bg-olive/10 text-olive',
  en_camino: 'bg-olive/10 text-olive',
  entregado: 'bg-espresso/10 text-espresso',
  cancelado: 'bg-rose/10 text-rose',
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');

  useEffect(() => {
    setLoading(true);
    orderService
      .listOrders(filter === 'todos' ? undefined : filter)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <h1 className="text-3xl mb-6">Pedidos</h1>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
              filter === s ? 'bg-espresso text-cream' : 'bg-almond/60 text-espresso hover:bg-almond'
            }`}
          >
            {s === 'todos' ? 'Todos' : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoading />
      ) : orders.length === 0 ? (
        <EmptyState title="No hay pedidos" description="Los pedidos que reciba ORIGEN aparecerán aquí." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-charcoal/50 border-b border-espresso/10">
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-espresso/5 last:border-0">
                  <td className="px-4 py-3 font-mono text-espresso">{order.order_number}</td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3 font-mono">Bs {Number(order.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-charcoal/60">{order.payment_method_name}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColor[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-charcoal/50 text-xs">{new Date(order.created_at).toLocaleDateString('es-BO')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/pedidos/${order.id}`} className="text-gold-dark font-medium hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
