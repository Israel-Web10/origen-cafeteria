import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuditEntry } from '../../types';
import { auditLog } from '../../services/adminService';
import { formatDate } from '../../lib/format';
import { PageHeader } from '../ui';

const LIMIT = 50;

export function Audit() {
  const { t, i18n } = useTranslation();
  const [entity, setEntity] = useState('');
  const [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { auditLog({ entity: entity || undefined, limit: LIMIT, offset }).then(setEntries).catch(() => {}); }, [entity, offset]);

  return (
    <div className="max-w-6xl">
      <PageHeader title={t('admin.nav.audit')} subtitle={t('admin.audit.subtitle')} />
      <select className="input !w-auto mb-4" value={entity} onChange={(e) => { setOffset(0); setEntity(e.target.value); }}>
        <option value="">{t('menu.all')}</option>
        {['order', 'payment', 'product', 'category', 'settings', 'exchange_rate', 'currency', 'user', 'inventory_item', 'page', 'image', 'report', 'promotion', 'payment_method'].map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>{t('admin.orders.date')}</th><th>{t('admin.inventory.user')}</th><th>{t('admin.audit.action')}</th><th>{t('admin.audit.entity')}</th><th>IP</th><th></th></tr></thead>
          <tbody>{entries.map((e) => (
            <Fragment key={e.id}>
              <tr>
                <td className="whitespace-nowrap text-xs">{formatDate(e.created_at, i18n.language, { dateStyle: 'short', timeStyle: 'medium' })}</td>
                <td>{e.user_name || '—'}</td><td className="font-mono text-xs">{e.action}</td><td className="text-xs">{e.entity} {e.entity_id}</td><td className="text-xs">{e.ip}</td>
                <td>{(e.before || e.after) && <button className="btn-ghost btn-sm" onClick={() => setOpen(open === e.id ? null : e.id)}>{t('common.view')}</button>}</td>
              </tr>
              {open === e.id && (
                <tr><td colSpan={6}>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <pre className="bg-rose/5 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{JSON.stringify(e.before, null, 2)}</pre>
                    <pre className="bg-olive/5 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{JSON.stringify(e.after, null, 2)}</pre>
                  </div>
                </td></tr>
              )}
            </Fragment>
          ))}</tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-4">
        <button className="btn-outline btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>←</button>
        <button className="btn-outline btn-sm" disabled={entries.length < LIMIT} onClick={() => setOffset(offset + LIMIT)}>→</button>
      </div>
    </div>
  );
}
