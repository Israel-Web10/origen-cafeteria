import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Product, Category } from '../types';
import * as productService from '../services/productService';
import * as categoryService from '../services/categoryService';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';

export function Menu() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const activeCategoryId = searchParams.get('categoria');

  useEffect(() => {
    categoryService.listCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    productService
      .listProducts({
        category_id: activeCategoryId ? Number(activeCategoryId) : undefined,
        search: search || undefined,
      })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [activeCategoryId, search]);

  const grouped = useMemo(() => {
    if (activeCategoryId) return { [activeCategoryId]: products };
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      const key = String(p.category_id);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  }, [products, activeCategoryId]);

  function selectCategory(id: number | null) {
    if (id === null) setSearchParams({});
    else setSearchParams({ categoria: String(id) });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Menú</h1>
        <p className="text-charcoal/60">Todo preparado al momento, con ingredientes de calidad.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="search"
          placeholder="Buscar en el menú..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input sm:max-w-xs"
        />
      </div>

      {/* Sticky category tabs */}
      <div className="sticky top-16 z-30 bg-cream/95 backdrop-blur-sm -mx-4 sm:mx-0 px-4 sm:px-0 py-3 mb-6 flex gap-2 overflow-x-auto border-b border-espresso/10">
        <button
          onClick={() => selectCategory(null)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !activeCategoryId ? 'bg-espresso text-cream' : 'bg-almond/60 text-espresso hover:bg-almond'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => selectCategory(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategoryId === String(cat.id) ? 'bg-espresso text-cream' : 'bg-almond/60 text-espresso hover:bg-almond'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState title="No encontramos productos" description="Prueba con otra categoría o término de búsqueda." />
      ) : activeCategoryId ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        Object.entries(grouped).map(([catId, items]) => {
          const cat = categories.find((c) => c.id === Number(catId));
          if (!cat || items.length === 0) return null;
          return (
            <div key={catId} className="mb-10">
              <h2 className="text-xl mb-4">{cat.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
