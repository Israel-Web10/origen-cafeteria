import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Order } from '../types';
import { ORDER_STATUS_FLOW } from '../types';
import * as orderService from '../services/orderService';
import * as paymentService from '../services/paymentService';
import { assetUrl, errorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { ConfirmModal } from '../components/Modal';
import { PageLoading } from '../components/Loading';
import { LogoMark } from '../components/Brand';
import { formatDate, formatMoney } from '../lib/format';
import { methodInstructions } from './Checkout';

const TERMINAL = ['entregado', 'cancelado'];

export function OrderPage() {
  const { t, i18n } = useTranslation();
  const { orderNumber = '' } = useParams();
  const [search] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const { notify } = useToast();
  const { settings } = useConfig();
  const stateOrder = (location.state as { order?: Order; fresh?: boolean } | null)?.order;
  const fresh = (location.state as { fresh?: boolean } | null)?.fresh;
  const token = search.get('t') || orderService.recentOrders().find((r) => r.order_number === orderNumber)?.token || stateOrder?.public_token;
  const [order, setOrder] = useState<Order | null | undefined>(stateOrder ?? undefined);
  const statePhone = (location.state as { phone4?: string } | null)?.phone4;
  const [phone4, setPhone4] = useState(statePhone || '');
  const [needsVerification, setNeedsVerification] = useState(false);

  const load = useCallback(async (opts: { phone4?: string } = {}) => {
    try {
      if (token) { setOrder(await orderService.track(orderNumber, { token })); return; }
      if (user) {
        const res = await orderService.listOrders({ search: orderNumber, limit: 1 });
        if (res.orders[0]) { setOrder(await orderService.getOrder(res.orders[0].id)); return; }
      }
      if (opts.phone4) { setOrder(await orderService.track(orderNumber, { phone4: opts.phone4 })); setNeedsVerification(false); return; }
      setNeedsVerification(true);
      setOrder(null);
    } catch (e) {
      if (opts.phone4) notify(errorMessage(e), 'error');
      setOrder((o) => o ?? null);
      if (!token && !user) setNeedsVerification(true);
    }
  }, [orderNumber, token, user, notify]);

  useEffect(() => { load({ phone4: statePhone }); }, [load, statePhone]);

  // Actualización periódica del estado mientras el pedido está en curso
  useEffect(() => {
    if (!order) return;
    if (TERMINAL.includes(order.status)) return;
    const id = setInterval(() => { if (document.visibilityState === 'visible') load({ phone4: order.limited ? phone4 : undefined }); }, 20000);
    return () => clearInterval(id);
  }, [order, load, token, user, phone4]);

  if (order === undefined) return <PageLoading />;

  if (!order) {
    return (
      <div className="section py-20 max-w-md">
        <h1 className="text-3xl mb-2">{t('order.verifyTitle')}</h1>
        <p className="text-charcoal/60 mb-6">{needsVerification ? t('order.verifyText', { number: orderNumber }) : t('errors.order_not_found')}</p>
        <form className="card p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); load({ phone4 }); }}>
          <label className="block">
            <span className="label">{t('track.phone4')}</span>
            <input className="input font-mono tracking-[0.5em] text-center" inputMode="numeric" maxLength={4} pattern="\d{4}" value={phone4} onChange={(e) => setPhone4(e.target.value.replace(/\D/g, ''))} required />
          </label>
          <button className="btn-primary w-full" disabled={phone4.length !== 4}>{t('track.submit')}</button>
        </form>
      </div>
    );
  }

  return <OrderView order={order} token={token} fresh={!!fresh} onRefresh={() => load({ phone4: order.limited ? phone4 : undefined })} lang={i18n.language} timezone={settings.timezone} />;
}

function OrderView({ order, token, fresh, onRefresh, lang, timezone }: { order: Order; token?: string | null; fresh: boolean; onRefresh: () => void; lang: string; timezone?: string }) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { user } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);
  const money = (c: number) => formatMoney(c, order.currency_code, lang);
  const cancelled = order.status === 'cancelado';
  const flow = ORDER_STATUS_FLOW.filter((s) => s !== 'en_camino' || order.delivery_type === 'delivery');
  const idx = flow.indexOf(order.status);
  const payment = order.payments?.[0];
  const canAct = !order.limited && (!!token || !!user);

  async function cancel() {
    setCancelOpen(false);
    try {
      await orderService.cancelOrder(order.id, token || undefined);
      notify(t('order.cancelled'), 'success');
      onRefresh();
    } catch (e) { notify(errorMessage(e), 'error'); }
  }

  return (
    <div className="section py-10 max-w-3xl">
      {fresh && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-8 no-print">
          <div className="w-16 h-16 rounded-full bg-olive text-cream flex items-center justify-center mx-auto mb-3 text-3xl">✓</div>
          <h1 className="text-4xl mb-1">{t('order.thanks')}</h1>
          <p className="text-charcoal/60">{t('order.saveLink')}</p>
        </motion.div>
      )}
      {!fresh && <h1 className="text-3xl mb-6">{t('order.title', { number: order.order_number })}</h1>}

      {/* Línea de tiempo */}
      <section className="card p-5 mb-6 no-print" aria-label={t('order.statusLabel')}>
        {cancelled ? (
          <p className="text-rose font-semibold">{t('status.cancelado')}{order.cancel_reason ? ` · ${order.cancel_reason}` : ''}</p>
        ) : (
          <ol className="flex items-start">
            {flow.map((s, i) => (
              <li key={s} className="flex-1 flex flex-col items-center text-center relative">
                {i > 0 && <span className={`absolute top-2 right-1/2 w-full h-0.5 ${i <= idx ? 'bg-gold' : 'bg-almond'}`} aria-hidden />}
                <motion.span
                  className={`relative z-10 w-4 h-4 rounded-full border-2 ${i <= idx ? 'bg-gold border-gold' : 'bg-cream border-almond'}`}
                  animate={i === idx ? { scale: [1, 1.3, 1] } : undefined} transition={{ duration: 1.6, repeat: Infinity }}
                />
                <span className={`text-[11px] mt-2 ${i <= idx ? 'text-espresso font-semibold' : 'text-charcoal/40'}`} aria-current={i === idx ? 'step' : undefined}>{t(`status.${s}`)}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-charcoal/50 mt-4 text-center">{t('order.autoRefresh')}</p>
      </section>

      {/* Pago */}
      {canAct && payment && <PaymentPanel order={order} token={token} onDone={onRefresh} />}
      {order.limited && <p className="card p-4 mb-6 text-sm text-charcoal/70">{t('order.limitedView')}</p>}

      {/* Comprobante de pedido */}
      <section className="card p-6 sm:p-8">
        <div className="flex items-start justify-between pb-5 mb-5 border-b border-dashed border-espresso/20">
          <div className="flex items-center gap-3"><LogoMark /><div><p className="font-display text-xl">{t('order.receipt')}</p><p className="text-xs text-charcoal/50">{t('order.notInvoice')}</p></div></div>
          <div className="text-right text-sm">
            <p className="font-mono font-semibold">{order.order_number}</p>
            <p className="text-xs text-charcoal/50">{formatDate(order.created_at, lang, undefined, timezone)}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm mb-5">
          <div><p className="label">{t('order.customer')}</p><p>{order.customer_name}</p>{order.customer_phone && <p className="text-charcoal/60">{order.customer_phone}</p>}</div>
          <div><p className="label">{t('checkout.delivery')}</p><p>{order.delivery_type === 'delivery' ? t('checkout.deliveryOpt') : t('checkout.pickup')}</p>{order.delivery_address && <p className="text-charcoal/60">{order.delivery_address}</p>}</div>
          <div><p className="label">{t('checkout.payment')}</p><p>{order.payment_method_name || t(`payment.type.${order.payment_method_type}`)}</p><p className="text-charcoal/60">{t(`paymentStatus.${order.payment_status}`)}</p></div>
        </div>
        <table className="table-base mb-4">
          <thead><tr><th>{t('order.product')}</th><th className="text-center">{t('order.qty')}</th><th className="text-right">{t('cart.subtotal')}</th></tr></thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i}>
                <td>{it.product_name}{it.variant_name ? <span className="text-charcoal/50"> · {it.variant_name}</span> : null}</td>
                <td className="text-center">{it.quantity}</td>
                <td className="text-right font-mono">{it.subtotal_cents !== undefined ? money(it.subtotal_cents) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="text-sm space-y-1 ml-auto max-w-xs">
          {order.subtotal_cents !== undefined && <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd className="font-mono">{money(order.subtotal_cents)}</dd></div>}
          {order.discount_cents > 0 && <div className="flex justify-between text-olive"><dt>{t('cart.discount')}</dt><dd className="font-mono">− {money(order.discount_cents)}</dd></div>}
          {order.delivery_fee_cents > 0 && <div className="flex justify-between"><dt>{t('cart.delivery')}</dt><dd className="font-mono">{money(order.delivery_fee_cents)}</dd></div>}
          <div className="flex justify-between font-semibold text-lg border-t border-espresso/10 pt-2"><dt>{t('cart.total')}</dt><dd className="font-mono">{money(order.total_cents)}</dd></div>
          {order.display_currency && order.display_rate && (
            <p className="text-xs text-charcoal/50 text-right">{t('order.displayRate', { currency: order.display_currency, rate: order.display_rate })}</p>
          )}
        </dl>
        {order.observations && <p className="text-sm text-charcoal/60 mt-4">{t('checkout.observations')}: {order.observations}</p>}
      </section>

      <div className="flex flex-wrap gap-3 mt-6 no-print">
        <button className="btn-outline" onClick={() => window.print()}>{t('order.print')}</button>
        {token && (
          <button className="btn-outline" onClick={() => { navigator.clipboard?.writeText(window.location.href); notify(t('order.linkCopied'), 'success'); }}>
            {t('order.copyLink')}
          </button>
        )}
        {canAct && order.status === 'pendiente' && <button className="btn-danger" onClick={() => setCancelOpen(true)}>{t('order.cancel')}</button>}
        <Link to="/carta" className="btn-primary ml-auto">{t('cart.keepShopping')}</Link>
      </div>
      <ConfirmModal open={cancelOpen} danger title={t('order.cancelTitle')} description={t('order.cancelText')} confirmLabel={t('order.cancel')} onConfirm={cancel} onCancel={() => setCancelOpen(false)} />
    </div>
  );
}

function PaymentPanel({ order, token, onDone }: { order: Order; token?: string | null; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const payment = order.payments![0];
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const money = (c: number) => formatMoney(c, order.currency_code, i18n.language);
  const instructions = methodInstructions({ config: order.payment_method_config || {} } as never, i18n.language);

  if (order.status === 'cancelado') return null;

  if (order.payment_status === 'pagado') {
    return <section className="card p-5 mb-6 border-l-4 border-l-olive"><p className="font-semibold text-olive">✓ {t('payment.verified')}</p>{payment.gateway_mode === 'test' && <p className="text-xs text-rose mt-1">{t('checkout.testModeText')}</p>}</section>;
  }
  if (payment.status === 'en_verificacion') {
    return <section className="card p-5 mb-6 border-l-4 border-l-gold"><p className="font-semibold">{t('payment.inReview')}</p><p className="text-sm text-charcoal/60">{t('payment.inReviewText')}</p></section>;
  }

  async function sendProof(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !reference.trim()) { notify(t('payment.proofRequired'), 'error'); return; }
    if (file && file.size > 5 * 1024 * 1024) { notify(t('errors.file_too_large'), 'error'); return; }
    setBusy(true);
    try {
      await paymentService.submitProof(order.id, { file, reference: reference.trim() || undefined, token: token || undefined });
      notify(t('payment.proofSent'), 'success');
      onDone();
    } catch (err) { notify(errorMessage(err), 'error'); } finally { setBusy(false); }
  }

  async function simulate(outcome: 'approved' | 'declined') {
    setBusy(true);
    try { await paymentService.cardTest(order.id, outcome, token || undefined); onDone(); }
    catch (err) { notify(errorMessage(err), 'error'); } finally { setBusy(false); }
  }

  return (
    <section className="card p-6 mb-6" aria-labelledby="pay-title">
      <h2 id="pay-title" className="text-2xl mb-1">{t('payment.title')}</h2>
      {payment.status === 'rechazado' && <p className="text-sm text-rose mb-3">{t('payment.rejected')}{payment.rejection_reason ? `: ${payment.rejection_reason}` : ''}</p>}
      <p className="text-sm text-charcoal/60 mb-4">{t('payment.amount')}: <strong className="font-mono text-espresso text-lg">{money(order.total_cents)}</strong></p>

      {order.payment_method_type === 'qr' && (
        <div className="grid sm:grid-cols-[200px_1fr] gap-6">
          {order.payment_method_config?.qr_image
            ? <img src={assetUrl(order.payment_method_config.qr_image)} alt={t('payment.qrAlt')} className="w-full max-w-[200px] aspect-square object-contain bg-white rounded-xl border border-espresso/10 p-2" />
            : <div className="aspect-square rounded-xl bg-almond flex items-center justify-center text-xs text-center p-3">{t('payment.qrMissing')}</div>}
          <form onSubmit={sendProof} className="space-y-3">
            {instructions && <p className="text-sm">{instructions}</p>}
            <label className="block"><span className="label">{t('payment.reference')}</span><input className="input" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
            <div>
              <span className="label">{t('payment.proof')}</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button type="button" className="btn-outline btn-sm" onClick={() => fileRef.current?.click()}>{file ? file.name : t('payment.chooseFile')}</button>
              <p className="text-xs text-charcoal/50 mt-1">{t('payment.proofHint')}</p>
            </div>
            <button className="btn-gold" disabled={busy}>{busy ? t('common.sending') : t('payment.send')}</button>
            <p className="text-xs text-charcoal/50">{t('payment.manualNote')}</p>
          </form>
        </div>
      )}

      {order.payment_method_type === 'cash' && (
        <p className="text-sm">{instructions || t('payment.cashText')}</p>
      )}

      {order.payment_method_type === 'card' && (
        <div className="rounded-xl border-2 border-dashed border-rose p-4">
          <p className="font-semibold text-rose mb-2">{t('checkout.testMode')}</p>
          <p className="text-sm mb-3">{t('payment.cardTestText')}</p>
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" disabled={busy} onClick={() => simulate('approved')}>{t('payment.simulateOk')}</button>
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => simulate('declined')}>{t('payment.simulateFail')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
