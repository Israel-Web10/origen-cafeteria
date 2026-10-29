import api from './api';
import type { DeliveryType, Locale, Order, OrderPaymentStatus, OrderStatus, Quote } from '../types';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType: DeliveryType;
  deliveryAddress?: { address: string; reference?: string; zone_id?: number };
  paymentMethodId: number;
  items: { product_id: number; variant_id?: number | null; quantity: number }[];
  observations?: string;
  displayCurrency?: string;
  locale?: Locale;
  acceptTerms: true;
}

export const quote = (payload: { deliveryType: DeliveryType; deliveryAddress?: { zone_id?: number }; items: CreateOrderPayload['items'] }) =>
  api.post<{ quote: Quote }>('/orders/quote', payload).then((r) => r.data.quote);

export const createOrder = (payload: CreateOrderPayload, idempotencyKey: string) =>
  api.post<{ order: Order }>('/orders', payload, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data.order);

export const getOrder = (id: number, token?: string) =>
  api.get<{ order: Order }>(`/orders/${id}`, { params: token ? { token } : {} }).then((r) => r.data.order);

export const track = (orderNumber: string, params: { token?: string; phone4?: string }) =>
  api.get<{ order: Order }>(`/orders/track/${encodeURIComponent(orderNumber)}`, { params }).then((r) => r.data.order);

export const cancelOrder = (id: number, token?: string, reason?: string) =>
  api.post<{ order: Order }>(`/orders/${id}/cancel`, { token, reason }).then((r) => r.data.order);

export const listOrders = (params: { status?: OrderStatus; payment_status?: OrderPaymentStatus; from?: string; to?: string; search?: string; limit?: number; offset?: number }) =>
  api.get<{ orders: Order[]; total: number }>('/orders', { params }).then((r) => r.data);

export const changeStatus = (id: number, status: OrderStatus, note?: string) =>
  api.put<{ order: Order }>(`/orders/${id}/status`, { status, note }).then((r) => r.data.order);

// Pedidos recientes de este dispositivo (para invitados): número + token secreto
const RECENT_KEY = 'origen_recent_orders';
export interface RecentOrder { id: number; order_number: string; token: string; created_at: string }

export function rememberOrder(o: RecentOrder) {
  try {
    const list = recentOrders().filter((r) => r.id !== o.id);
    localStorage.setItem(RECENT_KEY, JSON.stringify([o, ...list].slice(0, 10)));
  } catch { /* almacenamiento no disponible */ }
}

export function recentOrders(): RecentOrder[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function forgetOrders() {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* noop */ }
}
