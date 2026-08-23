import type { Product } from '../types';
import { resolveImageUrl } from '../services/uploadService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { notify } = useToast();
  const outOfStock = product.stock !== null && product.stock <= 0;
  const unavailable = !product.available || outOfStock;

  function handleAdd() {
    addItem(product, 1);
    notify(`${product.name} agregado al carrito`, 'success');
  }

  return (
    <div className="card overflow-hidden group flex flex-col">
      <div className="aspect-[4/3] bg-almond overflow-hidden relative">
        {product.image_url ? (
          <img
            src={resolveImageUrl(product.image_url)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-espresso/30 font-display text-3xl">
            ORIGEN
          </div>
        )}
        {unavailable && (
          <div className="absolute inset-0 bg-espresso/60 flex items-center justify-center">
            <span className="badge bg-cream text-espresso">No disponible</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display text-lg text-espresso leading-tight mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-charcoal/60 line-clamp-2 mb-3 flex-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="font-mono font-semibold text-gold-dark text-lg">
            Bs {Number(product.price).toFixed(2)}
          </span>
          <button
            className="btn-primary !px-4 !py-2 text-xs"
            disabled={unavailable}
            onClick={handleAdd}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
