import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Order, OrderPaymentStatus, OrderStatus, Payment } from '../../types';
import { ORDER_TRANSITIONS } from '../../types';
import * as orderService from '../../services/orderService';
import * as paymentService from '../../services/paymentService';
import { errorMessage, fetchBlobUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import { formatDate, formatMoney, parseMoneyInput } from '../../lib/format';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { PageLoading } from '../../components/Loading';
import { PageHeader, Pagination } from '../ui';

const STATUSES: OrderStatus[] = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'];
const PAY: OrderPaymentStatus[] = ['pendiente', 'en_verificacion', 'pagado', 'rechazado', 'reembolsado'];
const LIMIT = 30;

export function Orders() {
  const { t, i18n } = useTranslation();
  const { settings } = useConfig();
  const [filters, setFilters] = useState<{ status?: OrderStatus; payment_status?: OrderPaymentStatus; search?: string; from?: string; to?: string }>({});
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ orders: Order[]; total: number } | null>(null);

  const load = useCallback(() => {
    orderService.listOrders({ ...filters, limit: LIMIT, offset }).then(setData).catch(() => setData({ orders: [], total: 0 }));
  }, [filters, offset]);
  useEffect(() => { load(); }, [load]);
  // Actualización automática para la operación en mostrador
  useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  const set = (patch: typeof filters) => { setOffset(0); setFilters((f) => ({ ...f, ...patch })); };

  return (
    <div>
      <PageHeader title={t('admin.nav.orders')} subtitle={t('admin.orders.subtitle')} />
      <div className="card p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input" placeholder={t('admin.orders.search')} onChange={(e) => set({ search: e.target.value || undefined })} />
        <select className="input" onChange={(e) => set({ status: (e.target.value || undefined) as OrderStatus })}>
          <option value="">{t('admin.orders.allStatus')}</option>{STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <select className="input" onChange={(e) => set({ payment_status: (e.target.value || undefined) as OrderPaymentStatus })}>
          <option value="">{t('admin.orders.allPayments')}</option>{PAY.map((s) => <option key={s} value={s}>{t(`paymentStatus.${s}`)}</option>)}
        </select>
        <input type="date" className="input" aria-label={t('admin.period.from')} onChange={(e) => set({ from: e.target.value || undefined })} />
        <input type="date" className="input" aria-label={t('admin.period.to')} onChange={(e) => set({ to: e.target.value || undefined })} />
      </div>
      <div className="card overflow-x-auto">
        {!data ? <PageLoading /> : (
          <table className="table-base">
            <thead><tr><th>{t('admin.orders.number')}</th><th>{t('admin.orders.date')}</th><th>{t('order.customer')}</th><th>{t('checkout.delivery')}</th><th>{t('admin.orders.status')}</th><th>{t('checkout.payment')}</th><th className="text-right">{t('cart.total')}</th></tr></thead>
            <tbody>
              {data.orders.length === 0 && <tr><td colSpan={7} className="text-center text-charcoal/50 py-10">{t('admin.orders.empty')}</td></tr>}
              {data.orders.map((o) => (
                <tr key={o.id} className="hover:bg-almond/30">
                  <td><Link to={`/admin/pedidos/${o.id}`} className="font-mono font-semibold underline-offset-2 hover:underline">{o.order_number}</Link></td>
                  <td className="whitespace-nowrap text-charcoal/70">{formatDate(o.created_at, i18n.language, { dateStyle: 'short', timeStyle: 'short' }, settings.timezone)}</td>
                  <td>{o.customer_name}<br /><span className="text-xs text-charcoal/50">{o.customer_phone}</span></td>
                  <td>{o.delivery_type === 'delivery' ? '🛵' : '🏪'} {t(o.delivery_type === 'delivery' ? 'checkout.deliveryOpt' : 'checkout.pickup')}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><StatusBadge payment={o.payment_status} /><br /><span className="text-xs text-charcoal/50">{o.payment_method_name}</span></td>
                  <td className="text-right font-mono">{formatMoney(o.total_cents, o.currency_code, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />}
    </div>
  );
}

export function OrderDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { notify } = useToast();
  const { settings } = useConfig();
  const [order, setOrder] = useState<Order | null>(null);
  const [note, setNote] = useState('');
  const load = useCallback(() => { orderService.getOrder(Number(id)).then(setOrder).catch((e) => notify(errorMessage(e), 'error')); }, [id, notify]);
  useEffect(() => { load(); }, [load]);
  if (!order) return <PageLoading />;
  const money = (c: number) => formatMoney(c, order.currency_code, i18n.language);
  const next = ORDER_TRANSITIONS[order.status].filter((s) => s !== 'en_camino' || order.delivery_type === 'delivery');

  async function change(status: OrderStatus) {
    if (status === 'cancelado' && !note.trim()) { notify(t('admin.orders.cancelReason'), 'error'); return; }
    try { setOrder(await orderService.changeStatus(order!.id, status, note.trim() || undefined)); setNote(''); notify(t('common.saved'), 'success'); }
    catch (e) { notify(errorMessage(e), 'error'); }
  }

  return (
    <div className="max-w-5xl">
      <Link to="/admin/pedidos" className="text-sm text-charcoal/60 hover:underline">← {t('admin.nav.orders')}</Link>
      <PageHeader title={order.order_number} subtitle={formatDate(order.created_at, i18n.language, undefined, settings.timezone)} actions={<><StatusBadge status={order.status} /><StatusBadge payment={order.payment_status} /></>} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5">
            <h2 className="text-xl mb-3">{t('admin.orders.items')}</h2>
            <table className="table-base">
              <thead><tr><th>{t('order.product')}</th><th className="text-center">{t('order.qty')}</th><th className="text-right">{t('admin.orders.unit')}</th><th className="text-right">{t('cart.subtotal')}</th></tr></thead>
              <tbody>{order.items.map((it) => (
                <tr key={it.id}><td>{it.product_name}{it.variant_name && <span className="text-charcoal/50"> · {it.variant_name}</span>}</td><td className="text-center">{it.quantity}</td>
                  <td className="text-right font-mono">{money(it.unit_price_cents)}</td><td className="text-right font-mono">{money(it.subtotal_cents)}{it.discount_cents > 0 && <span className="block text-xs text-olive">−{money(it.discount_cents)}</span>}</td></tr>
              ))}</tbody>
            </table>
            <dl className="text-sm mt-3 ml-auto max-w-xs space-y-1">
              <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{money(order.subtotal_cents)}</dd></div>
              {order.discount_cents > 0 && <div className="flex justify-between text-olive"><dt>{t('cart.discount')}</dt><dd>−{money(order.discount_cents)}</dd></div>}
              <div className="flex justify-between"><dt>{t('cart.delivery')}</dt><dd>{money(order.delivery_fee_cents)}</dd></div>
              <div className="flex justify-between font-semibold text-lg border-t pt-1"><dt>{t('cart.total')}</dt><dd>{money(order.total_cents)}</dd></div>
            </dl>
            {order.observations && <p className="mt-3 text-sm bg-gold/10 rounded-lg p-3">📝 {order.observations}</p>}
          </section>

          <section className="card p-5">
            <h2 className="text-xl mb-3">{t('admin.orders.payments')}</h2>
            {order.payments?.map((p) => <PaymentRow key={p.id} payment={p} onChange={load} />)}
          </section>

          <section className="card p-5">
            <h2 className="text-xl mb-3">{t('admin.orders.history')}</h2>
            <ol className="text-sm space-y-2">
              {order.history?.map((h, i) => (
                <li key={i} className="flex gap-3"><span className="text-charcoal/50 whitespace-nowrap">{formatDate(h.created_at, i18n.language, { dateStyle: 'short', timeStyle: 'short' }, settings.timezone)}</span>
                  <span><StatusBadge status={h.to_status} /> {h.changed_by_name && <span className="text-charcoal/60">· {h.changed_by_name}</span>} {h.note && <span className="text-charcoal/60">· {h.note}</span>}</span></li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="text-xl mb-3">{t('admin.orders.changeStatus')}</h2>
            {next.length === 0 ? <p className="text-sm text-charcoal/60">{t('admin.orders.final')}</p> : (
              <>
                <textarea className="input mb-3 min-h-[60px]" placeholder={t('admin.orders.note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
                <div className="flex flex-col gap-2">
                  {next.map((s) => <button key={s} className={s === 'cancelado' ? 'btn-danger btn-sm' : 'btn-primary btn-sm'} onClick={() => change(s)}>→ {t(`status.${s}`)}</button>)}
                </div>
                {order.payment_status !== 'pagado' && next.includes('confirmado') && <p className="text-xs text-charcoal/60 mt-2">{t('admin.orders.unpaidWarning')}</p>}
              </>
            )}
          </section>
          <section className="card p-5 text-sm space-y-1">
            <h2 className="text-xl mb-2">{t('order.customer')}</h2>
            <p className="font-semibold">{order.customer_name}</p>
            {order.customer_phone && <p><a className="underline" href={`tel:${order.customer_phone}`}>{order.customer_phone}</a> · <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}>WhatsApp</a></p>}
            {order.customer_email && <p>{order.customer_email}</p>}
            <p className="pt-2">{order.delivery_type === 'delivery' ? `🛵 ${order.delivery_address || ''}` : `🏪 ${t('checkout.pickup')}`}</p>
            {order.delivery_reference && <p className="text-charcoal/60">{order.delivery_reference}</p>}
            {order.delivery_zone_name && <p className="text-charcoal/60">{order.delivery_zone_name}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function PaymentRow({ payment, onChange }: { payment: Payment; onChange: () => void }) {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const [proof, setProof] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'verify' | 'reject' | 'refund' | null>(null);
  const [cash, setCash] = useState('');
  const [reason, setReason] = useState('');
  const money = (c: number) => formatMoney(c, payment.currency_code, i18n.language);
  const open = payment.status === 'pendiente' || payment.status === 'en_verificacion';

  async function showProof() {
    try { setProof(await fetchBlobUrl(`/payments/${payment.id}/proof`)); } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function submit() {
    try {
      if (dialog === 'refund') await paymentService.refund(payment.id, reason);
      else {
        const cents = payment.method_type === 'cash' && dialog === 'verify' ? parseMoneyInput(cash) : undefined;
        if (payment.method_type === 'cash' && dialog === 'verify' && (cents === null || cents === undefined)) { notify(t('admin.payments.cashInvalid'), 'error'); return; }
        await paymentService.review(payment.id, { decision: dialog === 'verify' ? 'verificado' : 'rechazado', reason: reason || undefined, cash_received_cents: cents ?? undefined });
      }
      setDialog(null); setReason(''); setCash('');
      notify(t('common.saved'), 'success');
      onChange();
    } catch (e) { notify(errorMessage(e), 'error'); }
  }
  const received = parseMoneyInput(cash);

  return (
    <div className="border border-espresso/10 rounded-xl p-4 mb-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-semibold">{t(`payment.type.${payment.method_type}`)} · {money(payment.amount_cents)} {payment.gateway_mode === 'test' && <span className="badge bg-rose text-cream ml-1">TEST</span>}</p>
          <p className="text-charcoal/60">{payment.reference ? `${t('payment.reference')}: ${payment.reference}` : t('admin.payments.noReference')}</p>
          {payment.verified_by_name && <p className="text-xs text-charcoal/50">{t('admin.payments.verifiedBy', { name: payment.verified_by_name, date: formatDate(payment.verified_at!, i18n.language) })}</p>}
          {payment.change_cents != null && <p className="text-xs">{t('admin.payments.cashInfo', { received: money(payment.cash_received_cents || 0), change: money(payment.change_cents) })}</p>}
          {payment.rejection_reason && <p className="text-xs text-rose">{payment.rejection_reason}</p>}
        </div>
        <StatusBadge payment={payment.status} />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {payment.has_proof && <button className="btn-outline btn-sm" onClick={showProof}>{t('admin.payments.viewProof')}</button>}
        {open && payment.method_type !== 'card' && <>
          <button className="btn-primary btn-sm" onClick={() => setDialog('verify')}>{t('admin.payments.verify')}</button>
          <button className="btn-outline btn-sm" onClick={() => setDialog('reject')}>{t('admin.payments.reject')}</button>
        </>}
        {payment.status === 'verificado' && <button className="btn-ghost btn-sm text-rose" onClick={() => setDialog('refund')}>{t('admin.payments.refund')}</button>}
      </div>
      <Modal open={!!proof} onClose={() => { if (proof) URL.revokeObjectURL(proof); setProof(null); }} title={t('admin.payments.proof')} maxWidth="max-w-2xl">
        {proof && <img src={proof} alt={t('admin.payments.proof')} className="w-full rounded-lg" />}
        <p className="text-xs text-charcoal/60 mt-3">{t('admin.payments.proofWarning')}</p>
      </Modal>
      <Modal open={!!dialog} onClose={() => setDialog(null)} title={dialog ? t(`admin.payments.${dialog}Title`) : ''} maxWidth="max-w-md">
        {dialog === 'verify' && payment.method_type === 'qr' && <p className="text-sm mb-3">{t('admin.payments.verifyQrText', { amount: money(payment.amount_cents) })}</p>}
        {dialog === 'verify' && payment.method_type === 'cash' && (
          <label className="block mb-3"><span className="label">{t('admin.payments.cashReceived')}</span>
            <input className="input" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder={(payment.amount_cents / 100).toFixed(2)} />
            {received !== null && received >= payment.amount_cents && <span className="text-sm text-olive mt-1 block">{t('admin.payments.change', { change: money(received - payment.amount_cents) })}</span>}
          </label>
        )}
        {(dialog === 'reject' || dialog === 'refund') && (
          <label className="block mb-3"><span className="label">{t('admin.payments.reason')} *</span><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></label>
        )}
        {dialog === 'refund' && <p className="text-xs text-charcoal/60 mb-3">{t('admin.payments.refundNote')}</p>}
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setDialog(null)}>{t('common.cancel')}</button><button className={dialog === 'verify' ? 'btn-primary' : 'btn-danger'} onClick={submit}>{t('common.confirm')}</button></div>
      </Modal>
    </div>
  );
}
