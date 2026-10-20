// Páginas de contenido editable: historia, instalaciones, FAQ y políticas legales.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ImageAsset, Locale, Page } from '../types';
import { getPage, listImages } from '../services/contentService';
import { Markdown } from '../components/Markdown';
import { SceneBand } from '../components/ImmersiveHero';
import { PageLoading } from '../components/Loading';
import { Carousel } from '../components/Carousel';
import { useConfig, useCalmMotion } from '../context/ConfigContext';
import { assetUrl } from '../services/api';
import { formatDate } from '../lib/format';

const LEGAL = ['privacy', 'cookies', 'terms', 'refunds', 'order-conditions'];

export function ContentPage({ slug: fixedSlug }: { slug?: string }) {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const slug = fixedSlug || params.slug || '';
  const { settings } = useConfig();
  const calm = useCalmMotion();
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const legal = LEGAL.includes(slug);

  useEffect(() => {
    setPage(undefined);
    getPage(slug, i18n.language as Locale).then(setPage).catch(() => setPage(null));
    if (slug === 'facilities') listImages('facility').then(setImages).catch(() => {});
  }, [slug, i18n.language]);

  if (page === undefined) return <PageLoading />;
  if (page === null) {
    return <div className="section py-24 text-center"><h1 className="text-3xl mb-4">{t('errors.page_not_found')}</h1><Link to="/" className="btn-primary">{t('nav.home')}</Link></div>;
  }

  const meta = (
    <p className="text-xs text-charcoal/50 mt-8">
      {t('content.updated', { date: formatDate(page.updated_at, i18n.language, { dateStyle: 'long' }), version: page.version })}
      {page.fallback && ` · ${t('content.fallback')}`}
    </p>
  );

  if (legal) {
    return (
      <div className="section py-12 max-w-3xl">
        <nav className="text-sm mb-6 flex flex-wrap gap-3" aria-label={t('legal.title')}>
          {LEGAL.map((s) => <Link key={s} to={`/legal/${s}`} className={`chip ${s === slug ? 'chip-on' : 'chip-off'}`}>{t(`legal.${s === 'order-conditions' ? 'orderConditions' : s}`)}</Link>)}
        </nav>
        <h1 className="text-4xl mb-6">{page.title}</h1>
        <Markdown source={page.body} />
        {meta}
      </div>
    );
  }

  const video = slug === 'history' && !calm ? settings.story_video_url : null;
  return (
    <div>
      <SceneBand eyebrow={t(`content.eyebrow.${slug}`, { defaultValue: '' })} title={page.title} image={assetUrl(slug === 'history' ? settings.story_poster_url : settings.hero_poster_url)} />
      <div className="section py-14 grid lg:grid-cols-[1fr_380px] gap-12">
        <div className="max-w-2xl">
          <Markdown source={page.body} />
          {meta}
        </div>
        <aside className="space-y-4">
          {video && (
            <figure className="rounded-card overflow-hidden shadow-lift relative">
              <video src={assetUrl(video)} poster={assetUrl(settings.story_poster_url)} autoPlay muted loop playsInline preload="none" className="w-full aspect-video object-cover" aria-hidden="true" />
              <figcaption className="absolute bottom-2 left-2 text-[11px] text-cream bg-espresso/60 px-2 py-0.5 rounded-full">{t('home.illustrativeShort')}</figcaption>
            </figure>
          )}
          <div className="card p-5">
            <p className="font-display text-xl mb-2">{t('content.ctaTitle')}</p>
            <p className="text-sm text-charcoal/60 mb-4">{t('content.ctaText')}</p>
            <Link to="/carta" className="btn-gold w-full">{t('home.ctaMenu')}</Link>
          </div>
        </aside>
      </div>
      {images.length > 0 && (
        <section className="section pb-10">
          <Carousel label={t('home.galleryTitle')} itemClassName="w-[85%] sm:w-[48%] lg:w-[32%]">
            {images.map((img) => (
              <figure key={img.id} className="relative aspect-[4/3] rounded-card overflow-hidden">
                <img src={assetUrl(img.url)} alt={img.alt_text || ''} loading="lazy" className="w-full h-full object-cover" />
                {img.is_illustrative && <figcaption className="absolute bottom-2 left-2 text-[11px] text-cream bg-espresso/60 px-2 py-0.5 rounded-full">{t('home.illustrativeShort')}</figcaption>}
              </figure>
            ))}
          </Carousel>
        </section>
      )}
    </div>
  );
}
