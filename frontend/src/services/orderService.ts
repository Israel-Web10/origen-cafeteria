import api from './api';
import type { Order, OrderStatus, DashboardStats, DeliveryType } from '../types';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType: DeliveryType;
  deliveryAddress?: {
    recipient_name: string;
    phone: string;
    address: string;
    reference?: string;
    zone_id?: number;
    latitude?: number;
    longitude?: number;
  };
  paymentMethodId: number;
  items: { product_id: number; quantity: number }[];
  observations?: string;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await api.post<{ order: Order }>('/orders', payload);
  return data.order;
}

export async function listOrders(status?: OrderStatus): Promise<Order[]> {
  const { data } = await api.get<{ orders: Order[] }>('/orders', { params: { status } });
  return data.orders;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await api.get<{ order: Order }>(`/orders/${id}`);
  return data.order;
}

export async function trackOrder(orderNumber: string): Promise<Order> {
  const { data } = await api.get<{ order: Order }>(`/orders/track/${orderNumber}`);
  return data.order;
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  const { data } = await api.put<{ order: Order }>(`/orders/${id}/status`, { status });
  return data.order;
}

export async function getStats(): Promise<DashboardStats> {
  const { data } = await api.get<{ stats: DashboardStats }>('/orders/stats');
  return data.stats;
}
