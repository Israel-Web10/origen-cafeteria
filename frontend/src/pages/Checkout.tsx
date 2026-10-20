import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfig } from '../context/ConfigContext';
import { useQuote } from '../hooks/useQuote';
import { CartLines, QuoteSummary } from '../components/CartDrawer';
import * as paymentService from '../services/paymentService';
import * as orderService from '../services/orderService';
import { ApiError, assetUrl, errorMessage } from '../services/api';
import type { DeliveryType, Locale, PaymentMethod } from '../types';
import { tr } from '../lib/format';

function newKey() {
  return (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
}

export function methodInstructions(m: PaymentMethod | undefined, lang: string) {
  if (!m) return '';
  return (lang === 'en' && m.config.instructions_en) || (lang === 'fr' && m.config.instructions_fr) || m.config.instructions || '';
}

export function Checkout() {
  const { t, i18n } = useTranslation();
  const { items, clear } = useCart();
  const { user } = useAuth();
  const { notify } = useToast();
  const { config, settings, displayCurrency, activeRate, money } = useConfig();
  const navigate = useNavigate();

  const pickupOn = settings.pickup_enabled !== 'false';
  const deliveryOn = settings.delivery_enabled === 'true';
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', address: '', reference: '', observations: '' });
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(pickupOn ? 'pickup' : 'delivery');
  const [zoneId, setZoneId] = useState<number | undefined>(undefined);
  const [methodId, setMethodId] = useState<number | null>(null);
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const idempotency = useRef(newKey());
  const zones = useMemo(() => (config?.deliveryZones || []).filter((z) => z.active), [config]);
  const { quote, error: quoteError, loading: quoting } = useQuote(items, deliveryType, zoneId);

  useEffect(() => {
    paymentService.listMethods().then((m) => {
      const usable = m.filter((x) => !x.unavailable_reason);
      setMethods(usable);
      if (usable[0]) setMethodId(usable[0].id);
    }).catch(() => setMethods([]));
  }, []);
  useEffect(() => { if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || '' })); }, [user]);

  if (items.length === 0 && !submitting) {
    return (
      <div className="section py-24 text-center">
        <h1 className="text-3xl mb-3">{t('cart.emptyTitle')}</h1>
        <Link to="/carta" className="btn-primary">{t('cart.browse')}</Link>
      </div>
    );
  }

  const method = methods?.find((m) => m.id === methodId);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = t('checkout.errors.name');
    if (!/^[+\d][\d\s-]{5,29}$/.test(form.phone.trim())) errs.phone = t('checkout.errors.phone');
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = t('checkout.errors.email');
    if (deliveryType === 'delivery' && form.address.trim().length < 5) errs.address = t('checkout.errors.address');
    if (deliveryType === 'delivery' && zones.length && !zoneId) errs.zone = t('checkout.errors.zone');
    if (!methodId) errs.method = t('checkout.errors.method');
    if (!accept) errs.accept = t('checkout.errors.accept');
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !validate()) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const order = await orderService.createOrder({
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        customerEmail: form.email.trim() || undefined,
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? { address: form.address.trim(), reference: form.reference.trim() || undefined, zone_id: zoneId } : undefined,
        paymentMethodId: methodId!,
        items: items.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity })),
        observations: form.observations.trim() || undefined,
        displayCurrency: activeRate ? displayCurrency : undefined,
        locale: i18n.language as Locale,
        acceptTerms: true,
      }, idempotency.current);
      if (order.public_token) orderService.rememberOrder({ id: order.id, order_number: order.order_number, token: order.public_token, created_at: order.created_at });
      clear();
      notify(t('checkout.success'), 'success');
      navigate(`/pedido/${order.order_number}?t=${encodeURIComponent(order.public_token || '')}`, { replace: true, state: { order, fresh: true } });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.details?.fields) {
        setFieldErrors(Object.fromEntries(apiErr.details.fields.map((f) => [f.field, f.message])));
      }
      notify(errorMessage(err), 'error');
      // Si el servidor rechazó el pedido, un nuevo intento debe usar otra clave
      if (apiErr.status && apiErr.status < 500) idempotency.current = newKey();
      setSubmitting(false);
    }
  }

  const fieldClass = (k: string) => `input ${fieldErrors[k] ? '!border-rose focus:!ring-rose/30' : ''}`;
  const err = (k: string) => fieldErrors[k] && <p id={`err-${k}`} className="text-xs text-rose mt-1">{fieldErrors[k]}</p>;

  return (
    <div className="section py-10">
      <h1 className="text-4xl mb-2">{t('checkout.title')}</h1>
      <p className="text-charcoal/60 mb-8">{t('checkout.subtitle')}</p>
      <form onSubmit={submit} noValidate className="grid lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="sec-data">
            <h2 id="sec-data" className="text-2xl mb-4"><span className="text-gold-dark mr-2">1</span>{t('checkout.yourData')}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="c-name">{t('checkout.name')} *</label>
                <input id="c-name" className={fieldClass('name')} value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!fieldErrors.name} aria-describedby="err-name" required />
                {err('name')}
              </div>
              <div>
                <label className="label" htmlFor="c-phone">{t('checkout.phone')} *</label>
                <input id="c-phone" className={fieldClass('phone')} value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" placeholder="+591 7…" aria-invalid={!!fieldErrors.phone} aria-describedby="err-phone" required />
                {err('phone')}
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="c-email">{t('checkout.email')}</label>
                <input id="c-email" type="email" className={fieldClass('email')} value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={!!fieldErrors.email} aria-describedby="err-email" />
                {err('email')}
                <p className="text-xs text-charcoal/50 mt-1">{t('checkout.minimalData')}</p>
              </div>
            </div>
            {!user && <p className="text-xs text-charcoal/60 mt-3">{t('checkout.guestHint')} <Link to="/login" state={{ from: '/checkout' }} className="underline text-gold-dark">{t('nav.login')}</Link></p>}
          </section>

          <section className="card p-6" aria-labelledby="sec-delivery">
            <h2 id="sec-delivery" className="text-2xl mb-4"><span className="text-gold-dark mr-2">2</span>{t('checkout.delivery')}</h2>
            <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t('checkout.delivery')}>
              {pickupOn && (
                <OptionCard checked={deliveryType === 'pickup'} onSelect={() => setDeliveryType('pickup')} title={t('checkout.pickup')} text={settings.address || t('checkout.pickupText')} />
              )}
              {deliveryOn && (
                <OptionCard checked={deliveryType === 'delivery'} onSelect={() => setDeliveryType('delivery')} title={t('checkout.deliveryOpt')} text={t('checkout.deliveryText')} />
              )}
            </div>
            {deliveryType === 'delivery' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid gap-4 mt-5 overflow-hidden">
                {zones.length > 0 && (
                  <div>
                    <label className="label" htmlFor="c-zone">{t('checkout.zone')} *</label>
                    <select id="c-zone" className={fieldClass('zone')} value={zoneId ?? ''} onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : undefined)} aria-invalid={!!fieldErrors.zone}>
                      <option value="">{t('checkout.chooseZone')}</option>
                      {zones.map((z) => <option key={z.id} value={z.id}>{z.name} · {money(z.cost_cents)} · ~{z.estimated_time_minutes} min</option>)}
                    </select>
                    {err('zone')}
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="c-address">{t('checkout.address')} *</label>
                  <input id="c-address" className={fieldClass('address')} value={form.address} onChange={set('address')} autoComplete="street-address" aria-invalid={!!fieldErrors.address} />
                  {err('address')}
                </div>
                <div>
                  <label className="label" htmlFor="c-ref">{t('checkout.reference')}</label>
                  <input id="c-ref" className="input" value={form.reference} onChange={set('reference')} placeholder={t('checkout.referencePlaceholder')} />
                </div>
              </motion.div>
            )}
          </section>

          <section className="card p-6" aria-labelledby="sec-pay">
            <h2 id="sec-pay" className="text-2xl mb-4"><span className="text-gold-dark mr-2">3</span>{t('checkout.payment')}</h2>
            {methods === null ? <div className="skeleton h-16" /> : methods.length === 0 ? (
              <p className="text-rose">{t('checkout.noMethods')}</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t('checkout.payment')}>
                {methods.map((m) => (
                  <OptionCard
                    key={m.id}
                    checked={methodId === m.id}
                    onSelect={() => setMethodId(m.id)}
                    title={tr(m, i18n.language)}
                    text={t(`checkout.methodHint.${m.type}`)}
                    badge={m.test_mode ? t('checkout.testMode') : undefined}
                  />
                ))}
              </div>
            )}
            {err('method')}
            {method && (
              <div className="mt-4 rounded-xl bg-almond/40 p-4 text-sm text-charcoal/80 flex gap-4 items-start">
                {method.type === 'qr' && method.config.qr_image && (
                  <img src={assetUrl(method.config.qr_image)} alt={t('payment.qrAlt')} className="w-28 h-28 object-contain bg-white rounded-lg border border-espresso/10 shrink-0" />
                )}
                <div>
                  <p>{methodInstructions(method, i18n.language)}</p>
                  {method.type === 'qr' && <p className="mt-2 text-xs">{t('checkout.qrAfter')}</p>}
                  {method.type === 'card' && method.test_mode && <p className="mt-2 text-xs font-semibold text-rose">{t('checkout.testModeText')}</p>}
                  <p className="mt-2 text-xs text-charcoal/60">{t('checkout.chargeCurrency', { currency: config?.currencies.find((c) => c.is_base)?.code || 'BOB' })}</p>
                </div>
              </div>
            )}
          </section>

          <section className="card p-6">
            <label className="label" htmlFor="c-obs">{t('checkout.observations')}</label>
            <textarea id="c-obs" className="input min-h-[80px]" maxLength={500} value={form.observations} onChange={set('observations')} placeholder={t('checkout.observationsPlaceholder')} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="card p-5">
            <h2 className="text-xl mb-3">{t('cart.summary')}</h2>
            <div className="max-h-64 overflow-y-auto mb-4"><CartLines editable={false} /></div>
            {quoteError ? <p role="alert" className="text-sm text-rose">{quoteError.message} <Link to="/carrito" className="underline">{t('cart.viewFull')}</Link></p> : <QuoteSummary quote={quote} loading={quoting} deliveryLabel />}
            {quote?.delivery_zone && <p className="text-xs text-charcoal/60 mt-2">{t('checkout.eta', { min: quote.delivery_zone.estimated_time_minutes })}</p>}
          </div>
          <label className="flex items-start gap-3 text-sm card p-4 cursor-pointer">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 accent-gold w-4 h-4" aria-invalid={!!fieldErrors.accept} />
            <span>
              {t('checkout.accept1')} <Link to="/legal/order-conditions" target="_blank" className="underline text-gold-dark">{t('legal.orderConditions')}</Link>, <Link to="/legal/terms" target="_blank" className="underline text-gold-dark">{t('legal.terms')}</Link> {t('checkout.accept2')} <Link to="/legal/privacy" target="_blank" className="underline text-gold-dark">{t('legal.privacy')}</Link>.
            </span>
          </label>
          {err('accept')}
          <button type="submit" className="btn-gold w-full !py-4 text-base" disabled={submitting || !!quoteError || !methods?.length}>
            {submitting ? t('checkout.sending') : quote ? t('checkout.confirmWithTotal', { total: money(quote.total_cents) }) : t('checkout.confirm')}
          </button>
          <p className="text-[11px] text-charcoal/50 text-center">{t('checkout.secureNote')}</p>
        </aside>
      </form>
    </div>
  );
}

function OptionCard({ checked, onSelect, title, text, badge }: { checked: boolean; onSelect: () => void; title: string; text?: string; badge?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`text-left rounded-xl border-2 p-4 transition-all ${checked ? 'border-gold bg-gold/10 shadow-soft' : 'border-espresso/10 bg-white/60 hover:border-espresso/30'}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold text-espresso">{title}</span>
        <span className={`w-4 h-4 rounded-full border-2 ${checked ? 'border-gold bg-gold' : 'border-espresso/30'}`} aria-hidden />
      </span>
      {badge && <span className="badge bg-rose text-cream mt-2">{badge}</span>}
      {text && <span className="block text-xs text-charcoal/60 mt-1">{text}</span>}
    </button>
  );
}
