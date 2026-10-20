import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Product } from '../types';
import * as catalog from '../services/catalogService';
import { assetUrl } from '../services/api';
import { AddToCartForm, ProductBadges, ProductCard } from '../components/ProductCard';
import { PageLoading } from '../components/Loading';
import { LogoMark } from '../components/Brand';
import { tr } from '../lib/format';
import { useCalmMotion } from '../context/ConfigContext';

export function ProductDetail() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const calm = useCalmMotion();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [related, setRelated] = useState<Product[]>([]);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setProduct(undefined);
    catalog.getProduct(slug)
      .then((p) => {
        setProduct(p);
        setImage(p.image_url ?? null);
        catalog.listProducts({ category: p.category_slug, limit: 5 }).then((r) => setRelated(r.filter((x) => x.id !== p.id).slice(0, 4))).catch(() => {});
      })
      .catch(() => setProduct(null));
  }, [slug]);

  if (product === undefined) return <PageLoading />;
  if (product === null) {
    return (
      <div className="section py-24 text-center">
        <h1 className="text-3xl mb-3">{t('product.notFound')}</h1>
        <Link to="/carta" className="btn-primary">{t('cart.browse')}</Link>
      </div>
    );
  }

  const lang = i18n.language;
  const name = tr(product, lang);
  const gallery = [product.image_url, ...(product.images || []).map((i) => i.url)].filter((u, i, a): u is string => !!u && a.indexOf(u) === i);

  return (
    <div className="section py-10">
      <nav className="text-sm text-charcoal/60 mb-6" aria-label={t('a11y.breadcrumb')}>
        <Link to="/carta" className="hover:underline">{t('nav.menu')}</Link>
        {product.category_slug && <> / <Link to={`/carta/${product.category_slug}`} className="hover:underline">{tr({ name: product.category_name || '', translations: product.category_translations }, lang)}</Link></>}
        {' / '}<span aria-current="page">{name}</span>
      </nav>
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <motion.div layoutId={`product-${product.id}`} className="aspect-square rounded-card overflow-hidden bg-almond shadow-lift" initial={calm ? false : { scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {image ? <img src={assetUrl(image)} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><LogoMark className="w-24 h-24 opacity-60" /></div>}
          </motion.div>
          {gallery.length > 1 && (
            <div className="flex gap-3 mt-3">
              {gallery.map((u) => (
                <button key={u} onClick={() => setImage(u)} className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${image === u ? 'border-gold' : 'border-transparent'}`} aria-label={t('product.viewImage')}>
                  <img src={assetUrl(u)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <ProductBadges product={product} />
          <h1 className="text-4xl md:text-5xl mt-3 mb-3">{name}</h1>
          {product.description && <p className="text-lg text-charcoal/70">{tr(product, lang, 'description')}</p>}
          <dl className="grid grid-cols-2 gap-3 mt-6 text-sm">
            {product.prep_time_minutes ? <div className="card p-3"><dt className="label">{t('product.prep')}</dt><dd>{t('product.prepTime', { min: product.prep_time_minutes })}</dd></div> : null}
            {product.stock !== null && <div className="card p-3"><dt className="label">{t('product.availability')}</dt><dd>{product.stock > 0 ? t('product.inStock', { count: product.stock }) : t('product.soldOut')}</dd></div>}
          </dl>
          {(product.ingredients || product.translations?.[lang as 'en' | 'fr']?.ingredients) && (
            <div className="mt-6"><h2 className="label">{t('product.ingredients')}</h2><p className="text-sm text-charcoal/70">{tr(product, lang, 'ingredients')}</p></div>
          )}
          {product.allergens && <div className="mt-4"><h2 className="label">{t('product.allergens')}</h2><p className="text-sm text-charcoal/70">{product.allergens}</p></div>}
          <div className="card p-5 mt-6"><AddToCartForm product={product} /></div>
          {product.tags.length > 0 && <p className="text-xs text-charcoal/50 mt-4">{product.tags.map((tag) => `#${tag}`).join(' ')}</p>}
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl md:text-3xl mb-6">{t('product.related')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
