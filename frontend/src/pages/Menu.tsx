import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import type { Category, Product } from '../types';
import * as catalog from '../services/catalogService';
import type { ProductQuery } from '../services/catalogService';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { SceneBand } from '../components/ImmersiveHero';
import { assetUrl, errorMessage } from '../services/api';
import { tr } from '../lib/format';
import { staggerContainer, staggerItem } from '../lib/transitions';

type Sort = NonNullable<ProductQuery['sort']>;

export function Menu() {
  const { t, i18n } = useTranslation();
  const { category: categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(params.get('q') || '');
  const [debounced, setDebounced] = useState(search);
  const sort = (params.get('orden') as Sort) || 'recommended';
  const onlyPromo = params.get('promo') === '1';
  const onlyNew = params.get('nuevo') === '1';

  useEffect(() => { catalog.listCategories().then(setCategories).catch(() => {}); }, []);
  useEffect(() => { const id = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(id); }, [search]);

  useEffect(() => {
    let cancelled = false;
    setProducts(null);
    catalog
      .listProducts({ category: categorySlug, search: debounced || undefined, sort, promo: onlyPromo || undefined, new: onlyNew || undefined })
      .then((p) => { if (!cancelled) { setProducts(p); setError(null); } })
      .catch((e) => { if (!cancelled) { setError(errorMessage(e)); setProducts([]); } });
    return () => { cancelled = true; };
  }, [categorySlug, debounced, sort, onlyPromo, onlyNew]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const active = categories.find((c) => c.slug === categorySlug);
  const grouped = useMemo(() => {
    if (!products || categorySlug || debounced || sort !== 'recommended') return null;
    const map = new Map<number, Product[]>();
    for (const p of products) map.set(p.category_id, [...(map.get(p.category_id) || []), p]);
    return categories.filter((c) => map.has(c.id)).map((c) => ({ category: c, items: map.get(c.id)! }));
  }, [products, categories, categorySlug, debounced, sort]);

  return (
    <div>
      <SceneBand
        eyebrow={t('menu.eyebrow')}
        title={active ? tr(active, i18n.language) : t('menu.title')}
        subtitle={active ? tr(active, i18n.language, 'description') : t('menu.subtitle')}
        image={assetUrl(active?.image_url || '/media/video/carta-poster.webp')}
        video={active ? undefined : '/media/video/carta.mp4'}
      />

      <div className="sticky top-16 z-30 bg-cream/95 backdrop-blur-md border-b border-espresso/10">
        <div className="section py-3 flex flex-col gap-3">
          <nav className="flex gap-2 overflow-x-auto no-scrollbar" aria-label={t('menu.categories')}>
            <Link to="/carta" className={`chip ${!categorySlug ? 'chip-on' : 'chip-off'}`}>{t('menu.all')}</Link>
            {categories.map((c) => (
              <Link key={c.id} to={`/carta/${c.slug}`} className={`chip ${categorySlug === c.slug ? 'chip-on' : 'chip-off'}`} aria-current={categorySlug === c.slug ? 'page' : undefined}>
                {tr(c, i18n.language)}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex-1 min-w-[200px]">
              <span className="sr-only">{t('menu.search')}</span>
              <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setParam('q', e.target.value || null); }} placeholder={t('menu.searchPlaceholder')} className="input !py-2" />
            </label>
            <label>
              <span className="sr-only">{t('menu.sort')}</span>
              <select value={sort} onChange={(e) => setParam('orden', e.target.value === 'recommended' ? null : e.target.value)} className="input !py-2 !w-auto">
                {(['recommended', 'popular', 'price_asc', 'price_desc', 'newest', 'name'] as Sort[]).map((s) => <option key={s} value={s}>{t(`menu.sorts.${s}`)}</option>)}
              </select>
            </label>
            <button className={`chip ${onlyPromo ? 'chip-on' : 'chip-off'}`} aria-pressed={onlyPromo} onClick={() => setParam('promo', onlyPromo ? null : '1')}>{t('menu.onlyPromo')}</button>
            <button className={`chip ${onlyNew ? 'chip-on' : 'chip-off'}`} aria-pressed={onlyNew} onClick={() => setParam('nuevo', onlyNew ? null : '1')}>{t('menu.onlyNew')}</button>
          </div>
        </div>
      </div>

      <div className="section py-10">
        {error && <p role="alert" className="text-rose mb-4">{error}</p>}
        {products === null ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
        ) : products.length === 0 ? (
          <EmptyState title={t('menu.emptyTitle')} description={t('menu.emptyText')} action={<Link to="/carta" className="btn-outline" onClick={() => setSearch('')}>{t('menu.reset')}</Link>} />
        ) : (
          <>
            <p className="text-sm text-charcoal/60 mb-6" aria-live="polite">{t('menu.results', { count: products.length })}</p>
            <AnimatePresence mode="wait">
              {grouped ? (
                <motion.div key="grouped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {grouped.map(({ category, items }) => (
                    <section key={category.id} className="mb-14" aria-labelledby={`cat-${category.id}`}>
                      <div className="flex items-end justify-between mb-5">
                        <h2 id={`cat-${category.id}`} className="text-2xl md:text-3xl">{tr(category, i18n.language)}</h2>
                        <Link to={`/carta/${category.slug}`} className="text-sm text-gold-dark hover:underline">{t('menu.seeCategory')} →</Link>
                      </div>
                      <ProductGrid products={items} />
                    </section>
                  ))}
                </motion.div>
              ) : (
                <motion.div key={`${categorySlug}-${sort}-${debounced}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProductGrid products={products} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <motion.ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" variants={staggerContainer} initial="hidden" animate="show">
      {products.map((p) => <motion.li key={p.id} variants={staggerItem}><ProductCard product={p} /></motion.li>)}
    </motion.ul>
  );
}
