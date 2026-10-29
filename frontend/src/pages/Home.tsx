import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Category, ImageAsset, Product, Promotion } from '../types';
import * as catalog from '../services/catalogService';
import { listImages } from '../services/contentService';
import { ImmersiveHero } from '../components/ImmersiveHero';
import { StreetScene } from '../components/StreetScene';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Loading';
import { Carousel } from '../components/Carousel';
import { CoffeeJourney } from '../components/CoffeeJourney';
import { HowToOrder } from '../components/HowToOrder';
import { Lightbox } from '../components/Lightbox';
import { FloatingBeans, Magnetic, RevealText, Tilt3D, VelocityMarquee } from '../components/Motion3D';
import { CacaoPod, CoffeeBean, ChocolateSquare } from '../components/Brand';
import { useConfig, useCalmMotion } from '../context/ConfigContext';
import { assetUrl } from '../services/api';
import { formatDate, tr } from '../lib/format';
import { openStatus, parseHours } from '../lib/hours';
import { staggerContainer, staggerItem } from '../lib/transitions';

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const calm = useCalmMotion();
  return (
    <motion.div className={className} initial={calm ? false : { opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: [0.22, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

const CATEGORY_ART = [CoffeeBean, CacaoPod, ChocolateSquare];

export function Home() {
  const { t, i18n } = useTranslation();
  const { settings } = useConfig();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[] | null>(null);
  const [popular, setPopular] = useState<Product[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [gallery, setGallery] = useState<ImageAsset[]>([]);
  const [failed, setFailed] = useState(false);
  const [photo, setPhoto] = useState<number | null>(null);
  // Primero la calle; tras "Entrar", el interior. Se recuerda en la sesión para no repetir la entrada.
  const [inside, setInside] = useState(() => {
    try { return sessionStorage.getItem('origen_inside') === '1'; } catch { return false; }
  });
  const enter = () => {
    try { sessionStorage.setItem('origen_inside', '1'); } catch { /* sin almacenamiento */ }
    setInside(true);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    Promise.all([
      catalog.listCategories(),
      catalog.listProducts({ featured: true, limit: 12 }),
      catalog.listProducts({ sort: 'popular', limit: 8 }),
      catalog.listPromotions(),
      listImages('facility').catch(() => []),
    ])
      .then(([cats, feat, pop, pr, imgs]) => {
        setCategories(cats);
        setFeatured(feat);
        setPopular(pop.filter((p) => (p.popularity ?? 0) > 0));
        setPromos(pr);
        setGallery(imgs);
      })
      .catch(() => { setFailed(true); setFeatured([]); });
  }, []);

  // Fotos de productos reales para la cinta (destacados + populares, sin repetir)
  const marquee = [...(featured || []), ...popular]
    .filter((p, i, a) => p.image_url && a.findIndex((q) => q.id === p.id) === i)
    .slice(0, 12)
    .map((p) => ({ src: assetUrl(p.image_url) ?? '', label: tr(p, i18n.language), to: `/producto/${p.slug}` }));

  const hours = parseHours(settings.opening_hours);
  const status = openStatus(hours, settings.timezone);
  const lang = i18n.language;

  return (
    <div>
      {settings.street_scene_enabled !== 'false' && !inside ? (
        <StreetScene onEnter={enter} />
      ) : (
        <motion.div initial={inside ? { opacity: 0, scale: 1.08 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
          <ImmersiveHero />
        </motion.div>
      )}

      {/* Categorías: la puerta a cada espacio de la carta */}
      <section id="explorar" className="section pt-20 pb-10">
        <Reveal>
          <p className="eyebrow mb-2">{t('home.exploreEyebrow')}</p>
          <RevealText text={t('home.exploreTitle')} className="text-3xl md:text-5xl mb-8" />
        </Reveal>
        {failed && <p className="text-rose">{t('errors.network_error')}</p>}
        <motion.ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {categories.map((c, i) => {
            const Art = CATEGORY_ART[i % CATEGORY_ART.length];
            return (
              <motion.li key={c.id} variants={staggerItem}>
                <Tilt3D>
                <Link to={`/carta/${c.slug}`} className="group relative block aspect-[4/5] rounded-card overflow-hidden bg-espresso shadow-soft">
                  {c.image_url
                    ? <img src={assetUrl(c.image_url)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                    : <Art className="absolute -right-4 -bottom-4 w-28 opacity-40 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/30 to-transparent" />
                  <div className="absolute bottom-0 p-4">
                    <h3 className="text-cream text-xl leading-tight">{tr(c, lang)}</h3>
                    {c.product_count ? <p className="text-cream/60 text-xs mt-1">{t('home.productCount', { count: c.product_count })}</p> : null}
                  </div>
                </Link>
                </Tilt3D>
              </motion.li>
            );
          })}
        </motion.ul>
      </section>

      {/* Cinta de la carta: se acelera y se inclina con la velocidad del scroll */}
      {marquee.length >= 4 && (
        <section className="py-6" aria-label={t('home.featuredTitle')}>
          <VelocityMarquee items={marquee} label={t('home.featuredTitle')} />
        </section>
      )}

      {/* Destacados */}
      <section className="section py-12 relative isolate">
        <FloatingBeans />
        <Reveal><p className="eyebrow mb-2">{t('home.featuredEyebrow')}</p><RevealText text={t('home.featuredTitle')} className="text-3xl md:text-4xl mb-8" /></Reveal>
        {featured === null ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
        ) : featured.length ? (
          <Carousel label={t('home.featuredTitle')}>{featured.map((p) => <ProductCard key={p.id} product={p} />)}</Carousel>
        ) : (
          <p className="text-charcoal/60">{t('home.noFeatured')} <Link to="/carta" className="underline text-gold-dark">{t('home.ctaMenu')}</Link></p>
        )}
      </section>

      {/* Del cafetal a la taza: relato guiado por el scroll */}
      <CoffeeJourney />

      {/* Promociones vigentes */}
      {promos.length > 0 && (
        <section className="py-12">
          <div className="section">
            <Reveal className="rounded-card bg-gradient-to-br from-espresso to-espresso-light text-cream p-8 md:p-12 relative overflow-hidden">
              <CacaoPod className="absolute -right-6 -top-6 w-40 opacity-25 rotate-12" />
              <p className="eyebrow !text-gold-light mb-2">{t('home.promoEyebrow')}</p>
              <h2 className="text-3xl md:text-4xl text-cream mb-6">{t('home.promoTitle')}</h2>
              <ul className="grid md:grid-cols-2 gap-4 relative">
                {promos.slice(0, 4).map((p) => (
                  <li key={p.id} className="rounded-xl bg-cream/10 border border-cream/15 p-4 backdrop-blur">
                    <p className="font-display text-xl text-cream">{tr(p, lang)}</p>
                    <p className="text-cream/70 text-sm">
                      {p.kind === 'percent' ? `−${p.value}%` : t('product.promo')} · {p.product_name || p.category_name} · {t('home.until', { date: formatDate(p.ends_at, lang, { dateStyle: 'medium' }) })}
                    </p>
                  </li>
                ))}
              </ul>
              <span className="block mt-6 relative"><Magnetic><Link to="/promociones" className="btn-gold">{t('home.promoCta')}</Link></Magnetic></span>
            </Reveal>
          </div>
        </section>
      )}

      {/* Lo más pedido (datos reales de ventas de los últimos 90 días) */}
      {popular.length > 0 && (
        <section className="section py-12">
          <Reveal><p className="eyebrow mb-2">{t('home.popularEyebrow')}</p><RevealText text={t('home.popularTitle')} className="text-3xl md:text-4xl mb-8" /></Reveal>
          <Carousel label={t('home.popularTitle')}>{popular.map((p) => <ProductCard key={p.id} product={p} />)}</Carousel>
        </section>
      )}

      <HowToOrder />

      {/* Historia */}
      <section className="section py-16 grid md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <Tilt3D max={6}>
            <div className="relative aspect-[4/3] rounded-card overflow-hidden shadow-lift">
              {settings.story_poster_url && <img src={assetUrl(settings.story_poster_url)} alt="" className="w-full h-full object-cover" loading="lazy" />}
              <div className="absolute inset-0 bg-gradient-to-tr from-espresso/60 to-transparent" />
              <p className="absolute bottom-3 left-3 text-[11px] text-cream/70 bg-espresso/50 px-2 py-0.5 rounded-full">{t('home.illustrativeShort')}</p>
            </div>
          </Tilt3D>
        </Reveal>
        <Reveal>
          <p className="eyebrow mb-2">{t('home.storyEyebrow')}</p>
          <RevealText text={t('home.storyTitle')} className="text-3xl md:text-5xl mb-4" />
          <p className="text-charcoal/70 text-lg mb-6">{t('home.storyText')}</p>
          <Magnetic><Link to="/historia" className="btn-outline">{t('home.ctaStory')}</Link></Magnetic>
        </Reveal>
      </section>

      {/* Galería del local (fotos subidas por el gerente) */}
      {gallery.length > 0 && (
        <section className="section py-12">
          <RevealText text={t('home.galleryTitle')} className="text-3xl md:text-4xl mb-8" />
          <Carousel label={t('home.galleryTitle')} itemClassName="w-[85%] sm:w-[48%] lg:w-[32%]">
            {gallery.map((img, i) => (
              <button key={img.id} type="button" onClick={() => setPhoto(i)} className="group relative block w-full aspect-[4/3] rounded-card overflow-hidden" aria-label={t('home.openPhoto', { name: img.alt_text || '' })}>
                <img src={assetUrl(img.url)} alt={img.alt_text || ''} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/20 transition-colors" aria-hidden />
                {img.is_illustrative && <span className="absolute bottom-2 left-2 text-[11px] text-cream bg-espresso/60 px-2 py-0.5 rounded-full">{t('home.illustrativeShort')}</span>}
              </button>
            ))}
          </Carousel>
          <Lightbox images={gallery.map((g) => ({ src: assetUrl(g.url) ?? '', alt: g.alt_text || '', illustrative: g.is_illustrative }))} index={photo} onClose={() => setPhoto(null)} />
        </section>
      )}

      {/* Visítanos */}
      <section className="section py-16">
        <Reveal className="card p-8 md:p-10 grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div>
            <span className={`badge mb-3 ${status.open ? 'bg-olive/15 text-olive' : 'bg-rose/10 text-rose'}`}>
              ● {status.open ? t('hours.openNow', { time: status.closesAt }) : status.opensAt ? t('hours.closedNow', { day: t(`days.${status.opensDay}`), time: status.opensAt }) : t('hours.closed')}
            </span>
            <RevealText text={t('home.visitTitle')} className="text-3xl md:text-4xl mb-3" />
            <p className="text-charcoal/70 mb-6">{settings.address || t('visit.addressPending')}{settings.city ? ` · ${settings.city}` : ''}</p>
            <div className="flex flex-wrap gap-3">
              <Magnetic><Link to="/visitanos" className="btn-primary">{t('home.ctaVisit')}</Link></Magnetic>
              <Link to="/seguimiento" className="btn-outline">{t('nav.track')}</Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center"><CoffeeBean className="w-28 opacity-80 animate-float" /></div>
        </Reveal>
      </section>
    </div>
  );
}
