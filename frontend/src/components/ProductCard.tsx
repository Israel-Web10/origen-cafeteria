import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Product, Variant } from '../types';
import { assetUrl } from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useConfig, useCalmMotion } from '../context/ConfigContext';
import { tr } from '../lib/format';
import { Modal } from './Modal';
import { LogoMark } from './Brand';
import { Tilt3D } from './Motion3D';

export function PriceTag({ product, variant, size = 'md' }: { product: Product; variant?: Variant | null; size?: 'md' | 'lg' }) {
  const { money, displayMoney, activeRate } = useConfig();
  const delta = variant?.price_delta_cents ?? 0;
  const base = product.price_cents + delta;
  const factor = product.price_cents ? product.final_price_cents / product.price_cents : 1;
  const final = Math.round(base * factor);
  const big = size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2">
        <span className={`font-mono font-semibold text-gold-dark ${big}`}>{money(final)}</span>
        {final < base && <span className="font-mono text-xs line-through text-charcoal/50">{money(base)}</span>}
      </div>
      {activeRate && <span className="text-[11px] text-charcoal/50">{displayMoney(final)}</span>}
    </div>
  );
}

export function ProductBadges({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      {product.promotion && (
        <span className="badge bg-rose text-cream">
          {product.promotion.kind === 'percent' ? `−${product.promotion.value}%` : t('product.promo')} · {tr(product.promotion, i18n.language)}
        </span>
      )}
      {product.is_new && <span className="badge bg-olive text-cream">{t('product.new')}</span>}
      {product.is_featured && <span className="badge bg-gold text-espresso">{t('product.featured')}</span>}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  const [quick, setQuick] = useState(false);
  const { add, openDrawer } = useCart();
  const { notify } = useToast();
  const calm = useCalmMotion();
  const name = tr(product, i18n.language);
  const needsVariant = product.variants.some((v) => v.active);
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;

  function quickAdd() {
    if (needsVariant) { setQuick(true); return; }
    add(product, null, 1);
    notify(t('cart.added', { name }), 'success', { label: t('cart.view'), onClick: openDrawer });
  }

  return (
    <>
      <Tilt3D className="h-full">
      <motion.article
        whileHover={calm ? undefined : { y: -6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="card overflow-hidden group flex flex-col h-full"
      >
        <button onClick={() => setQuick(true)} className="relative aspect-[4/3] bg-almond overflow-hidden text-left" aria-label={t('product.quickView', { name })}>
          {product.image_url ? (
            <img src={assetUrl(product.image_url)} alt={name} loading="lazy" decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-almond to-cream-dark">
              <LogoMark className="w-12 h-12 opacity-70" />
              <span className="text-xs text-espresso/50">{t('product.noImage')}</span>
            </div>
          )}
          <div className="absolute top-3 left-3"><ProductBadges product={product} /></div>
          {!product.purchasable && (
            <div className="absolute inset-0 bg-espresso/60 flex items-center justify-center">
              <span className="badge bg-cream text-espresso">{t('product.unavailable')}</span>
            </div>
          )}
        </button>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-display text-lg text-espresso leading-tight">
            <Link to={`/producto/${product.slug}`} className="hover:underline underline-offset-4">{name}</Link>
          </h3>
          {product.description && <p className="text-sm text-charcoal/60 line-clamp-2 mt-1">{tr(product, i18n.language, 'description')}</p>}
          <div className="flex flex-wrap gap-x-3 text-[11px] text-charcoal/50 mt-1">
            {product.prep_time_minutes ? <span>⏱ {t('product.prepTime', { min: product.prep_time_minutes })}</span> : null}
            {lowStock && <span className="text-rose font-medium">{t('product.lowStock', { count: product.stock ?? 0 })}</span>}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-auto pt-3 gap-2">
            <PriceTag product={product} />
            <button className="btn-primary btn-sm w-full sm:w-auto" disabled={!product.purchasable} onClick={quickAdd}>
              {needsVariant ? t('product.choose') : t('product.add')}
            </button>
          </div>
        </div>
      </motion.article>
      </Tilt3D>
      <ProductQuickView product={product} open={quick} onClose={() => setQuick(false)} />
    </>
  );
}

export function ProductQuickView({ product, open, onClose }: { product: Product; open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const name = tr(product, i18n.language);
  return (
    <Modal open={open} onClose={onClose} title={name} maxWidth="max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="aspect-square rounded-xl bg-almond overflow-hidden">
          {product.image_url
            ? <img src={assetUrl(product.image_url)} alt={name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><LogoMark className="w-16 h-16 opacity-60" /></div>}
        </div>
        <div>
          <ProductBadges product={product} />
          {product.description && <p className="text-sm text-charcoal/70 mt-3">{tr(product, i18n.language, 'description')}</p>}
          <AddToCartForm product={product} onAdded={onClose} />
          <Link to={`/producto/${product.slug}`} onClick={onClose} className="inline-block mt-4 text-sm text-gold-dark underline">{t('product.details')}</Link>
        </div>
      </div>
    </Modal>
  );
}

export function AddToCartForm({ product, onAdded }: { product: Product; onAdded?: () => void }) {
  const { t, i18n } = useTranslation();
  const { add, openDrawer } = useCart();
  const { notify } = useToast();
  const { money } = useConfig();
  const variants = product.variants.filter((v) => v.active);
  const [variantId, setVariantId] = useState<number | null>(variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const max = product.stock !== null ? Math.min(50, product.stock) : 50;

  function submit() {
    add(product, variant, qty);
    notify(t('cart.added', { name: tr(product, i18n.language) }), 'success', { label: t('cart.view'), onClick: openDrawer });
    onAdded?.();
  }

  return (
    <div className="mt-4 space-y-4">
      {variants.length > 0 && (
        <fieldset>
          <legend className="label">{t('product.options')}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label key={v.id} className={`chip cursor-pointer ${variantId === v.id ? 'chip-on' : 'chip-off'}`}>
                <input type="radio" name={`variant-${product.id}`} className="sr-only" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                {tr(v, i18n.language)}{v.price_delta_cents ? ` (${v.price_delta_cents > 0 ? '+' : '−'}${money(Math.abs(v.price_delta_cents))})` : ''}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <PriceTag product={product} variant={variant} size="lg" />
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-espresso/15 bg-white" role="group" aria-label={t('product.quantity')}>
          <button className="w-10 h-10 rounded-full hover:bg-espresso/5" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={t('cart.decrease', { name: '' })}>−</button>
          <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
          <button className="w-10 h-10 rounded-full hover:bg-espresso/5" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label={t('cart.increase', { name: '' })}>+</button>
        </div>
        <button className="btn-gold flex-1" disabled={!product.purchasable} onClick={submit}>
          {product.purchasable ? t('product.addToCart') : t('product.unavailable')}
        </button>
      </div>
    </div>
  );
}
