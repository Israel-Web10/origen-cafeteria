// Carrito persistente en este dispositivo (localStorage). Solo guarda ids,
// cantidades y una copia de nombre/precio para mostrar: el precio real, el
// stock y los descuentos los recalcula siempre el servidor (cotización y pedido).
import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import type { CartLine, Product, Variant } from '../types';

interface CartContextValue {
  items: CartLine[];
  add: (product: Product, variant?: Variant | null, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  itemCount: number;
  estimatedSubtotal: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = 'origen_cart_v2';
const MAX_QTY = 50;

function load(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => Number.isInteger(l.product_id) && Number.isInteger(l.quantity) && l.quantity > 0).slice(0, 100);
  } catch {
    return [];
  }
}

export const lineKey = (productId: number, variantId?: number | null) => `${productId}:${variantId ?? 0}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(load);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* sin almacenamiento */ }
  }, [items]);

  // Sincroniza entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setItems(load()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((product: Product, variant?: Variant | null, quantity = 1) => {
    const key = lineKey(product.id, variant?.id);
    const discountFactor = product.price_cents ? product.final_price_cents / product.price_cents : 1;
    const unit = Math.round((product.price_cents + (variant?.price_delta_cents ?? 0)) * discountFactor);
    setItems((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity), unit_price_cents: unit } : l));
      return [...prev, {
        key, product_id: product.id, variant_id: variant?.id ?? null, quantity: Math.min(MAX_QTY, quantity),
        name: product.name, variant_name: variant?.name ?? null, image_url: product.image_url, unit_price_cents: unit,
        slug: product.slug, translations: product.translations,
      }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) => (quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l))));
  }, []);

  const remove = useCallback((key: string) => setItems((prev) => prev.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((s, l) => s + l.quantity, 0), [items]);
  const estimatedSubtotal = useMemo(() => items.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{
      items, add, setQuantity, remove, clear, itemCount, estimatedSubtotal,
      drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
