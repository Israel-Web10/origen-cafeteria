import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { useQuote } from '../hooks/useQuote';
import { Drawer } from './Modal';
import { assetUrl } from '../services/api';
import { tr } from '../lib/format';
import type { CartLine, Quote } from '../types';
import { LogoMark } from './Brand';

export function CartLines({ editable = true }: { editable?: boolean }) {
  const { t, i18n } = useTranslation();
  const { items, setQuantity, remove } = useCart();
  const { displayMoney } = useConfig();
  return (
    <ul className="divide-y divide-espresso/10">
      <AnimatePresence initial={false}>
        {items.map((l: CartLine) => (
          <motion.li key={l.key} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30, height: 0 }} className="flex gap-3 py-3">
            <div className="w-16 h-16 rounded-xl bg-almond overflow-hidden shrink-0 flex items-center justify-center">
              {l.image_url ? <img src={assetUrl(l.image_url)} alt="" className="w-full h-full object-cover" /> : <LogoMark className="w-8 h-8 opacity-60" />}
            </div>
            <div className="flex-1 min-w-0">
              <Link to={`/producto/${l.slug}`} className="font-medium text-espresso leading-tight hover:underline">{tr({ name: l.name, translations: l.translations }, i18n.language)}</Link>
              {l.variant_name && <p className="text-xs text-charcoal/60">{l.variant_name}</p>}
              <p className="text-xs text-charcoal/60 mt-0.5">{displayMoney(l.unit_price_cents)} · {t('cart.each')}</p>
              {editable && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="inline-flex items-center rounded-full border border-espresso/15 bg-white">
                    <button className="w-8 h-8 rounded-full hover:bg-espresso/5" onClick={() => setQuantity(l.key, l.quantity - 1)} aria-label={t('cart.decrease', { name: l.name })}>−</button>
                    <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">{l.quantity}</span>
                    <button className="w-8 h-8 rounded-full hover:bg-espresso/5" onClick={() => setQuantity(l.key, l.quantity + 1)} aria-label={t('cart.increase', { name: l.name })}>+</button>
                  </div>
                  <button className="text-xs text-rose hover:underline ml-auto" onClick={() => remove(l.key)}>{t('cart.remove')}</button>
                </div>
              )}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function QuoteSummary({ quote, loading, deliveryLabel }: { quote: Quote | null; loading?: boolean; deliveryLabel?: boolean }) {
  const { t } = useTranslation();
  const { money, displayMoney, activeRate } = useConfig();
  if (!quote) return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-4" />)}</div>;
  return (
    <dl className={`space-y-1.5 text-sm transition-opacity ${loading ? 'opacity-50' : ''}`}>
      <div className="flex justify-between text-charcoal/70"><dt>{t('cart.subtotal')}</dt><dd className="font-mono">{money(quote.subtotal_cents)}</dd></div>
      {quote.discount_cents > 0 && (
        <div className="flex justify-between text-olive"><dt>{t('cart.discount')}</dt><dd className="font-mono">− {money(quote.discount_cents)}</dd></div>
      )}
      {deliveryLabel && (
        <div className="flex justify-between text-charcoal/70"><dt>{t('cart.delivery')}</dt><dd className="font-mono">{quote.delivery_fee_cents ? money(quote.delivery_fee_cents) : t('cart.free')}</dd></div>
      )}
      <div className="flex justify-between text-espresso font-semibold text-lg pt-2 border-t border-espresso/10 mt-2">
        <dt>{t('cart.total')}</dt><dd className="font-mono">{money(quote.total_cents)}</dd>
      </div>
      {activeRate && <p className="text-xs text-charcoal/60 text-right">{displayMoney(quote.total_cents)} · {t('currency.reference')}</p>}
      <p className="text-[11px] text-charcoal/50">{t('cart.serverCalculated')}</p>
    </dl>
  );
}

export function CartDrawer() {
  const { t } = useTranslation();
  const { items, drawerOpen, closeDrawer, clear } = useCart();
  const { quote, error, loading } = useQuote(drawerOpen ? items : []);
  const navigate = useNavigate();

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      title={t('cart.title')}
      footer={items.length > 0 && (
        <div className="space-y-3">
          {error ? <p className="text-sm text-rose" role="alert">{error.message}</p> : <QuoteSummary quote={quote} loading={loading} />}
          <button className="btn-gold w-full" disabled={!!error} onClick={() => { closeDrawer(); navigate('/checkout'); }}>{t('cart.checkout')}</button>
          <div className="flex justify-between text-xs">
            <button className="text-charcoal/60 hover:underline" onClick={() => { closeDrawer(); navigate('/carrito'); }}>{t('cart.viewFull')}</button>
            <button className="text-rose hover:underline" onClick={clear}>{t('cart.clear')}</button>
          </div>
        </div>
      )}
    >
      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-20 h-20 rounded-full bg-almond/60 flex items-center justify-center mb-4"><LogoMark className="w-10 h-10 opacity-70" /></div>
          <p className="font-display text-xl text-espresso mb-1">{t('cart.emptyTitle')}</p>
          <p className="text-sm text-charcoal/60 mb-6">{t('cart.emptyText')}</p>
          <button className="btn-primary" onClick={() => { closeDrawer(); navigate('/carta'); }}>{t('cart.browse')}</button>
        </div>
      ) : <CartLines />}
    </Drawer>
  );
}
