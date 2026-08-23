import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, Category, Settings } from '../types';
import * as productService from '../services/productService';
import * as categoryService from '../services/categoryService';
import * as settingsService from '../services/settingsService';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Loading';
import { resolveImageUrl } from '../services/uploadService';

export function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productService.listProducts(),
      categoryService.listCategories(),
      settingsService.getSettings(),
    ])
      .then(([products, cats, settingsData]) => {
        setFeatured(products.slice(0, 4));
        setCategories(cats);
        setSettings(settingsData.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-espresso text-cream">
        <div className="absolute inset-0 bg-ring-motif bg-no-repeat bg-right opacity-60 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28 relative grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="badge bg-gold/20 text-gold-light mb-4">
              {settings.cafe_slogan || 'Café artesanal, de origen a taza'}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6 text-cream">
              El café que empieza<br />donde otros terminan.
            </h1>
            <p className="text-cream/70 text-lg mb-8 max-w-md">
              Tostado en pequeños lotes, servido con intención. Pide en línea y recíbelo fresco,
              o pásate por {settings.cafe_name || 'ORIGEN'}.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/menu" className="btn-gold">Ver el menú</Link>
              <Link to="/seguimiento" className="btn border border-cream/30 text-cream hover:bg-cream/10">
                Seguir un pedido
              </Link>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="aspect-square rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <div className="aspect-square w-4/5 rounded-full bg-almond/10 border border-cream/10 flex items-center justify-center">
                <span className="font-display text-8xl text-gold/40">O</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-2xl mb-6">Categorías</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/menu?categoria=${cat.id}`}
                className="shrink-0 px-5 py-3 rounded-full bg-almond/60 hover:bg-almond text-espresso text-sm font-medium transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl">Destacados</h2>
          <Link to="/menu" className="text-sm font-medium text-gold-dark hover:underline">
            Ver todo →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ABOUT */}
      <section id="nosotros" className="bg-almond/40 mt-20 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl mb-4">Nuestra historia</h2>
            <p className="text-charcoal/70 leading-relaxed mb-4">
              {settings.cafe_name || 'ORIGEN'} nació de la idea simple de que el café merece
              cuidado en cada paso: desde el productor hasta la taza. Seleccionamos granos de
              origen único, tostamos en lotes pequeños y preparamos cada bebida a mano.
            </p>
            <p className="text-charcoal/70 leading-relaxed">
              Cada visita — o cada pedido — es una invitación a bajar el ritmo un momento.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-square rounded-card bg-espresso/90" />
            <div className="aspect-square rounded-card bg-gold/70 mt-8" />
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl mb-4">Visítanos</h2>
          <ul className="space-y-3 text-charcoal/70">
            {settings.address && <li><strong className="text-espresso">Dirección:</strong> {settings.address}</li>}
            {settings.phone && <li><strong className="text-espresso">Teléfono:</strong> {settings.phone}</li>}
            {settings.opening_hours && (
              <li><strong className="text-espresso">Horarios:</strong> Lun-Vie 07:00-20:00, Sáb 08:00-20:00, Dom 08:00-14:00</li>
            )}
          </ul>
          {settings.gmaps_link && (
            <a href={settings.gmaps_link} target="_blank" rel="noreferrer" className="btn-outline mt-6 inline-flex">
              Cómo llegar
            </a>
          )}
        </div>
        <div className="rounded-card overflow-hidden bg-almond aspect-video flex items-center justify-center text-charcoal/40 text-sm">
          {settings.latitude && settings.longitude
            ? `Mapa: ${settings.latitude}, ${settings.longitude}`
            : 'Mapa no configurado'}
        </div>
      </section>

      {settings.logo_url && (
        <img src={resolveImageUrl(settings.logo_url)} alt="" className="hidden" />
      )}
    </div>
  );
}
