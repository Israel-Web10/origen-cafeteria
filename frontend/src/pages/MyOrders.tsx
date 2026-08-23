import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Order } from '../types';
import { ORDER_STATUS_LABELS } from '../types';
import * as orderService from '../services/orderService';
import { PageLoading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';

export function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.listOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl mb-8">Mis pedidos</h1>
      {orders.length === 0 ? (
        <EmptyState
          title="Todavía no tienes pedidos"
          description="Cuando hagas tu primer pedido, aparecerá aquí."
          action={<Link to="/menu" className="btn-primary">Ver menú</Link>}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/pedido/${order.order_number}`}
              className="card p-4 flex items-center justify-between hover:shadow-lift transition-shadow"
            >
              <div>
                <p className="font-mono font-semibold text-espresso">{order.order_number}</p>
                <p className="text-xs text-charcoal/50">{new Date(order.created_at).toLocaleString('es-BO')}</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold">Bs {Number(order.total).toFixed(2)}</p>
                <span className="badge bg-gold/10 text-gold-dark text-xs">{ORDER_STATUS_LABELS[order.status]}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
