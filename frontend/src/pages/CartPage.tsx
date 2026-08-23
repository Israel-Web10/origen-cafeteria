import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CartSummary } from '../components/CartDrawer';
import { EmptyState } from '../components/EmptyState';

export function CartPage() {
  const { items, clear } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          title="Tu carrito está vacío"
          description="Explora el menú y agrega tus productos favoritos."
          action={<Link to="/menu" className="btn-primary">Ver menú</Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl">Tu carrito</h1>
        <button className="text-sm text-rose hover:underline" onClick={clear}>Vaciar carrito</button>
      </div>

      <CartSummary />

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link to="/menu" className="btn-outline flex-1 justify-center">Seguir comprando</Link>
        <button className="btn-primary flex-1" onClick={() => navigate('/checkout')}>
          Continuar al pago
        </button>
      </div>
    </div>
  );
}
