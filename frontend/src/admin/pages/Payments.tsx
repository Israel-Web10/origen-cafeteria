import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Payment, PaymentStatus, PaymentType } from '../../types';
import * as paymentService from '../../services/paymentService';
import { PageHeader, Pagination } from '../ui';
import { PaymentRow } from './Orders';
import { PageLoading } from '../../components/Loading';

const LIMIT = 20;

export function Payments() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PaymentStatus | ''>('en_verificacion');
  const [method, setMethod] = useState<PaymentType | ''>('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ payments: Payment[]; total: number } | null>(null);
  const load = useCallback(() => {
    paymentService.listPayments({ status: status || undefined, method: method || undefined, limit: LIMIT, offset }).then(setData).catch(() => setData({ payments: [], total: 0 }));
  }, [status, method, offset]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  return (
    <div className="max-w-4xl">
      <PageHeader title={t('admin.nav.payments')} subtitle={t('admin.payments.subtitle')} />
      <div className="flex flex-wrap gap-2 mb-4">
        {(['en_verificacion', 'pendiente', 'verificado', 'rechazado', 'reembolsado', ''] as const).map((s) => (
          <button key={s || 'all'} className={`chip ${status === s ? 'chip-on' : 'chip-off'}`} onClick={() => { setOffset(0); setStatus(s); }}>{s ? t(`paymentStatus.${s}`) : t('menu.all')}</button>
        ))}
        <select className="input !w-auto !py-1.5 ml-auto" value={method} onChange={(e) => { setOffset(0); setMethod(e.target.value as PaymentType | ''); }}>
          <option value="">{t('admin.fields.paymentMethod')}</option>{(['qr', 'cash', 'card'] as const).map((m) => <option key={m} value={m}>{t(`payment.type.${m}`)}</option>)}
        </select>
      </div>
      {!data ? <PageLoading /> : data.payments.length === 0 ? <p className="card p-8 text-center text-charcoal/60">{t('admin.payments.empty')}</p> : (
        data.payments.map((p) => (
          <div key={p.id}>
            <p className="text-xs text-charcoal/60 mb-1"><Link to={`/admin/pedidos/${p.order_id}`} className="font-mono underline">{p.order_number}</Link> · {p.customer_name} · {t(`status.${p.order_status}`)}</p>
            <PaymentRow payment={p} onChange={load} />
          </div>
        ))
      )}
      {data && <Pagination total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />}
    </div>
  );
}
