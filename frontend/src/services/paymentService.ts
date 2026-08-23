import api from './api';
import type { PaymentMethod, Payment } from '../types';

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await api.get<{ paymentMethods: PaymentMethod[] }>('/payments/methods');
  return data.paymentMethods;
}

export async function updatePaymentMethod(id: number, payload: Partial<PaymentMethod>): Promise<PaymentMethod> {
  const { data } = await api.put<{ paymentMethod: PaymentMethod }>(`/payments/methods/${id}`, payload);
  return data.paymentMethod;
}

export async function listPayments(status?: string): Promise<Payment[]> {
  const { data } = await api.get<{ payments: Payment[] }>('/payments', { params: { status } });
  return data.payments;
}

export async function uploadProof(orderId: number, file: File): Promise<Payment> {
  const form = new FormData();
  form.append('proof', file);
  const { data } = await api.post<{ payment: Payment }>(`/payments/${orderId}/proof`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.payment;
}

export async function updatePaymentStatus(id: number, status: 'verificado' | 'rechazado' | 'pendiente'): Promise<Payment> {
  const { data } = await api.put<{ payment: Payment }>(`/payments/${id}/status`, { status });
  return data.payment;
}
