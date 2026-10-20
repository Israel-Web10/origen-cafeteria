import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Order } from '../types';
import { myOrders } from '../services/authService';
import { EmptyState } from '../components/EmptyState';
import { PageLoading } from '../components/Loading';
import { formatDate, formatMoney } from '../lib/format';
import { StatusBadge } from '../components/StatusBadge';

export function MyOrders() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => { myOrders({ limit: 100 }).then((r) => setOrders(r.orders)).catch(() => setOrders([])); }, []);
  if (!orders) return <PageLoading />;
  return (
    <div className="section max-w-3xl py-10">
      <div className="flex justify-between items-center mb-6"><h1 className="text-4xl">{t('nav.myOrders')}</h1><Link to="/perfil" className="btn-outline btn-sm">{t('nav.profile')}</Link></div>
      {orders.length === 0 ? (
        <EmptyState title={t('myOrders.emptyTitle')} description={t('myOrders.emptyText')} action={<Link to="/carta" className="btn-primary">{t('cart.browse')}</Link>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/pedido/${o.order_number}`} className="card p-4 flex flex-wrap gap-3 items-center justify-between hover:shadow-lift transition">
                <div><p className="font-mono font-semibold">{o.order_number}</p><p className="text-xs text-charcoal/60">{formatDate(o.created_at, i18n.language)}</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={o.status} /><StatusBadge payment={o.payment_status} /></div>
                <p className="font-mono font-semibold">{formatMoney(o.total_cents, o.currency_code, i18n.language)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
