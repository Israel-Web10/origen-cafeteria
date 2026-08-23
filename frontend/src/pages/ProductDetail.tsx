import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import * as productService from '../services/productService';
import { resolveImageUrl } from '../services/uploadService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { PageLoading } from '../components/Loading';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { notify } = useToast();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productService
      .getProduct(Number(id))
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoading />;

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl mb-2">Producto no encontrado</h1>
        <Link to="/menu" className="text-gold-dark underline">Volver al menú</Link>
      </div>
    );
  }

  const unavailable = !product.available || (product.stock !== null && product.stock <= 0);

  function handleAdd() {
    if (!product) return;
    addItem(product, quantity);
    notify(`${product.name} agregado al carrito`, 'success');
    navigate('/carrito');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/menu" className="text-sm text-espresso/60 hover:text-espresso mb-6 inline-block">← Volver al menú</Link>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square rounded-card overflow-hidden bg-almond">
          {product.image_url ? (
            <img src={resolveImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-espresso/30 font-display text-5xl">ORIGEN</div>
          )}
        </div>
        <div>
          {product.category_name && (
            <span className="badge bg-almond text-espresso mb-3">{product.category_name}</span>
          )}
          <h1 className="text-3xl mb-3">{product.name}</h1>
          {product.description && <p className="text-charcoal/70 leading-relaxed mb-6">{product.description}</p>}
          <p className="font-mono text-2xl text-gold-dark font-semibold mb-6">
            Bs {Number(product.price).toFixed(2)}
          </p>

          {unavailable ? (
            <p className="badge bg-rose/10 text-rose">No disponible en este momento</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-espresso/20 rounded-full">
                <button className="w-10 h-10 text-lg" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span className="w-8 text-center">{quantity}</span>
                <button className="w-10 h-10 text-lg" onClick={() => setQuantity((q) => q + 1)}>+</button>
              </div>
              <button className="btn-primary flex-1" onClick={handleAdd}>Agregar al carrito</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
