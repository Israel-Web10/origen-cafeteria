import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Product, Promotion } from '../types';
import * as catalog from '../services/catalogService';
import { SceneBand } from '../components/ImmersiveHero';
import { ProductGrid } from './Menu';
import { ProductCardSkeleton } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { formatDate, tr } from '../lib/format';

export function Promotions() {
  const { t, i18n } = useTranslation();
  const [promos, setPromos] = useState<Promotion[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    catalog.listPromotions().then(setPromos).catch(() => setPromos([]));
    catalog.listProducts({ promo: true }).then(setProducts).catch(() => setProducts([]));
  }, []);

  return (
    <div>
      <SceneBand eyebrow={t('promos.eyebrow')} title={t('promos.title')} subtitle={t('promos.subtitle')} image="/media/banners/promociones.webp" video="/media/video/promociones.mp4" />
      <div className="section py-12">
        {promos && promos.length > 0 && (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {promos.map((p) => (
              <li key={p.id} className="card p-5 border-l-4 border-l-gold">
                <p className="font-display text-2xl text-espresso">{p.kind === 'percent' ? `−${p.value}%` : t('product.promo')}</p>
                <p className="font-semibold">{tr(p, i18n.language)}</p>
                <p className="text-sm text-charcoal/60">{p.product_name || p.category_name}</p>
                <p className="text-xs text-charcoal/50 mt-2">{t('home.until', { date: formatDate(p.ends_at, i18n.language, { dateStyle: 'long' }) })}</p>
              </li>
            ))}
          </ul>
        )}
        {products === null ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
        ) : products.length ? <ProductGrid products={products} /> : (
          <EmptyState title={t('promos.emptyTitle')} description={t('promos.emptyText')} action={<Link to="/carta" className="btn-primary">{t('cart.browse')}</Link>} />
        )}
      </div>
    </div>
  );
}
