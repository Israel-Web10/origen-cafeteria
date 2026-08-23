import api from './api';
import type { User } from '../types';

export interface OrderSummary {
  id: number;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export async function listUsers(role?: 'client' | 'admin'): Promise<User[]> {
  const { data } = await api.get<{ users: User[] }>('/users', { params: { role } });
  return data.users;
}

export async function getUser(id: number): Promise<{ user: User; orders: OrderSummary[] }> {
  const { data } = await api.get<{ user: User; orders: OrderSummary[] }>(`/users/${id}`);
  return data;
}

export async function updateUser(id: number, payload: Partial<User>): Promise<User> {
  const { data } = await api.put<{ user: User }>(`/users/${id}`, payload);
  return data.user;
}
