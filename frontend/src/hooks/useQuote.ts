import { useEffect, useState } from 'react';
import type { CartLine, DeliveryType, Quote } from '../types';
import * as orderService from '../services/orderService';
import { ApiError } from '../services/api';

/** Cotización del servidor (precios, descuentos, envío) con debounce. */
export function useQuote(items: CartLine[], deliveryType: DeliveryType = 'pickup', zoneId?: number) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const signature = JSON.stringify([items.map((l) => [l.product_id, l.variant_id, l.quantity]), deliveryType, zoneId]);

  useEffect(() => {
    if (!items.length) { setQuote(null); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      orderService
        .quote({
          deliveryType,
          deliveryAddress: deliveryType === 'delivery' ? { zone_id: zoneId } : undefined,
          items: items.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity })),
        })
        .then((q) => { if (!cancelled) { setQuote(q); setError(null); } })
        .catch((e: ApiError) => { if (!cancelled) { setError(e); setQuote(null); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { quote, error, loading };
}
