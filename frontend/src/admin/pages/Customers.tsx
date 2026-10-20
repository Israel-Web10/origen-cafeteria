import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Order, User } from '../../types';
import * as admin from '../../services/adminService';
import { formatDate, formatMoney } from '../../lib/format';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { PageHeader, Pagination } from '../ui';

const LIMIT = 30;

export function Customers() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ users: User[]; total: number }>({ users: [], total: 0 });
  const [detail, setDetail] = useState<{ user: User; orders: Order[] } | null>(null);
  useEffect(() => {
    const id = setTimeout(() => admin.listUsers({ role: 'client', search: search || undefined, limit: LIMIT, offset }).then(setData).catch(() => {}), 250);
    return () => clearTimeout(id);
  }, [search, offset]);

  return (
    <div className="max-w-5xl">
      <PageHeader title={t('admin.nav.customers')} subtitle={t('admin.customers.subtitle')} />
      <input className="input max-w-sm mb-4" placeholder={t('admin.customers.search')} value={search} onChange={(e) => { setOffset(0); setSearch(e.target.value); }} />
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>{t('admin.fields.name')}</th><th>Email</th><th>{t('admin.customers.orders')}</th><th>{t('admin.customers.since')}</th><th></th></tr></thead>
          <tbody>{data.users.map((u) => (
            <tr key={u.id} className={!u.active ? 'opacity-50' : ''}>
              <td>{u.name}</td><td>{u.email}</td><td>{u.orders_count}</td><td>{u.created_at && formatDate(u.created_at, i18n.language, { dateStyle: 'medium' })}</td>
              <td><button className="btn-ghost btn-sm" onClick={() => admin.getUser(u.id).then(setDetail)}>{t('common.view')}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Pagination total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
      <p className="text-xs text-charcoal/50 mt-4">{t('admin.customers.privacy')}</p>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.user.name || ''} maxWidth="max-w-2xl">
        {detail && (
          <>
            <p className="text-sm">{detail.user.email} · {detail.user.phone || '—'}</p>
            <ul className="divide-y divide-espresso/10 mt-4 text-sm">
              {detail.orders.map((o) => (
                <li key={o.id} className="py-2 flex justify-between items-center gap-2">
                  <Link to={`/admin/pedidos/${o.id}`} className="font-mono underline">{o.order_number}</Link>
                  <StatusBadge status={o.status} />
                  <span className="font-mono">{formatMoney(o.total_cents, 'BOB', i18n.language)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </div>
  );
}
