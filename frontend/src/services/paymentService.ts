import api from './api';
import type { Payment, PaymentMethod, PaymentStatus, PaymentType } from '../types';

export const listMethods = (all = false) =>
  api.get<{ paymentMethods: PaymentMethod[] }>('/payments/methods', { params: all ? { all: true } : {} }).then((r) => r.data.paymentMethods);

export const saveMethod = (id: number, payload: Partial<PaymentMethod>) =>
  api.put<{ paymentMethod: PaymentMethod }>(`/payments/methods/${id}`, payload).then((r) => r.data.paymentMethod);

export const listPayments = (params: { status?: PaymentStatus; method?: PaymentType; from?: string; to?: string; limit?: number; offset?: number }) =>
  api.get<{ payments: Payment[]; total: number }>('/payments', { params }).then((r) => r.data);

export function submitProof(orderId: number, data: { file?: File | null; reference?: string; token?: string }) {
  const form = new FormData();
  if (data.file) form.append('proof', data.file);
  if (data.reference) form.append('reference', data.reference);
  if (data.token) form.append('token', data.token);
  return api.post<{ payment: Payment }>(`/payments/orders/${orderId}/proof`, form).then((r) => r.data.payment);
}

export const review = (id: number, payload: { decision: 'verificado' | 'rechazado'; reason?: string; cash_received_cents?: number }) =>
  api.put<{ payment: Payment }>(`/payments/${id}/review`, payload).then((r) => r.data.payment);

export const refund = (id: number, reason: string) => api.post(`/payments/${id}/refund`, { reason });

export const cardTest = (orderId: number, outcome: 'approved' | 'declined', token?: string) =>
  api.post<{ status: string; mode: 'test' }>(`/payments/orders/${orderId}/card-test`, { outcome, token }).then((r) => r.data);
