import api from './api';
import type { AnalyticsSummary, AuditEntry, InventoryItem, Order, Role, StockMovement, Supplier, User } from '../types';

export interface PeriodParams {
  period: string;
  date?: string;
  from?: string;
  to?: string;
  categoryId?: number;
  productId?: number;
  paymentMethodId?: number;
  locale?: string;
}

export const analytics = (params: PeriodParams) => api.get<AnalyticsSummary>('/analytics/summary', { params }).then((r) => r.data);

// Inventario
export const listItems = (all = false) => api.get<{ items: InventoryItem[] }>('/inventory/items', { params: all ? { all: true } : {} }).then((r) => r.data.items);
export const saveItem = (id: number | null, p: Record<string, unknown>) =>
  (id ? api.put<{ item: InventoryItem }>(`/inventory/items/${id}`, p) : api.post<{ item: InventoryItem }>('/inventory/items', p)).then((r) => r.data.item);
export const listMovements = (params: Record<string, unknown>) =>
  api.get<{ movements: StockMovement[]; total: number }>('/inventory/movements', { params }).then((r) => r.data);
export const recordMovement = (p: Record<string, unknown>) => api.post<{ movement: StockMovement }>('/inventory/movements', p).then((r) => r.data.movement);
export const alerts = (days = 14) =>
  api.get<{
    lowStock: { products: { id: number; name: string; stock: number; low_stock_threshold: number }[]; items: { id: number; name: string; unit: string; quantity: string; min_quantity: string }[] };
    expiring: { id: number; name: string; unit?: string; quantity: string; expires_at: string }[];
  }>('/inventory/alerts', { params: { days } }).then((r) => r.data);
export const listSuppliers = () => api.get<{ suppliers: Supplier[] }>('/inventory/suppliers').then((r) => r.data.suppliers);
export const saveSupplier = (id: number | null, p: Partial<Supplier>) =>
  (id ? api.put<{ supplier: Supplier }>(`/inventory/suppliers/${id}`, p) : api.post<{ supplier: Supplier }>('/inventory/suppliers', p)).then((r) => r.data.supplier);

// Usuarios
export const listUsers = (params: { role?: Role; search?: string; limit?: number; offset?: number }) =>
  api.get<{ users: User[]; total: number }>('/users', { params }).then((r) => r.data);
export const getUser = (id: number) => api.get<{ user: User; orders: Order[] }>(`/users/${id}`).then((r) => r.data);
export const updateUser = (id: number, p: { role?: Role; active?: boolean }) => api.put<{ user: User }>(`/users/${id}`, p).then((r) => r.data.user);
export const createStaff = (p: { name: string; email: string; role: 'manager' | 'admin' }) =>
  api.post<{ user: User; temporary_password: string }>('/users/staff', p).then((r) => r.data);

export const resetPassword = (id: number) => api.post<{ temporary_password: string }>(`/users/${id}/reset-password`).then((r) => r.data);

export const auditLog = (params: Record<string, unknown>) => api.get<{ entries: AuditEntry[] }>('/audit', { params }).then((r) => r.data.entries);
