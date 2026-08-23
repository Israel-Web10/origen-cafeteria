import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { resolveImageUrl } from '../services/uploadService';

/**
 * Resumen del carrito reutilizable: se usa tanto en la página /carrito
 * como panel lateral de "resumen del pedido" en /checkout.
 */
export function CartSummary({
  showItems = true,
  deliveryFee = 0,
  discount = 0,
}: {
  showItems?: boolean;
  deliveryFee?: number;
  discount?: number;
}) {
  const { items, subtotal, increment, decrement, removeItem } = useCart();
  const total = subtotal - discount + deliveryFee;

  return (
    <div className="card p-5">
      <h3 className="font-display text-xl mb-4">Resumen del pedido</h3>

      {showItems && (
        <ul className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-almond overflow-hidden shrink-0">
                {product.image_url && (
                  <img src={resolveImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-espresso truncate">{product.name}</p>
                <p className="text-xs text-charcoal/50">Bs {Number(product.price).toFixed(2)} c/u</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="w-6 h-6 rounded-full border border-espresso/20 text-xs hover:bg-espresso/5"
                  onClick={() => decrement(product.id)}
                  aria-label="Disminuir cantidad"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm">{quantity}</span>
                <button
                  className="w-6 h-6 rounded-full border border-espresso/20 text-xs hover:bg-espresso/5"
                  onClick={() => increment(product.id)}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>
              <button
                className="text-charcoal/30 hover:text-rose text-xs ml-1"
                onClick={() => removeItem(product.id)}
                aria-label="Eliminar producto"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5 text-sm border-t border-espresso/10 pt-4">
        <div className="flex justify-between text-charcoal/70">
          <span>Subtotal</span>
          <span className="font-mono">Bs {subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-olive">
            <span>Descuento</span>
            <span className="font-mono">− Bs {discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-charcoal/70">
          <span>Entrega</span>
          <span className="font-mono">{deliveryFee > 0 ? `Bs ${deliveryFee.toFixed(2)}` : 'Gratis'}</span>
        </div>
        <div className="flex justify-between text-espresso font-semibold text-base pt-2 border-t border-espresso/10 mt-2">
          <span>Total</span>
          <span className="font-mono">Bs {total.toFixed(2)}</span>
        </div>
      </div>

      {showItems && items.length === 0 && (
        <p className="text-sm text-charcoal/50 text-center py-4">
          Tu carrito está vacío. <Link to="/menu" className="text-gold-dark underline">Ver menú</Link>
        </p>
      )}
    </div>
  );
}
