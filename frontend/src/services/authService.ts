import api from './api';
import type { Locale, Order, User } from '../types';

export interface AuthResponse { user: User; token: string }

export const login = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data);

export const register = (payload: { name: string; email: string; password: string; phone?: string; preferred_locale?: Locale }) =>
  api.post<AuthResponse>('/auth/register', payload).then((r) => r.data);

export const me = () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user);

export const updateProfile = (payload: { name?: string; phone?: string; preferred_locale?: Locale }) =>
  api.put<{ user: User }>('/auth/me', payload).then((r) => r.data.user);

export const changePassword = (current_password: string, new_password: string) =>
  api.put<{ token: string }>('/auth/me/password', { current_password, new_password }).then((r) => r.data);

export const logoutAll = () => api.post('/auth/logout-all');

export const exportMyData = () => api.get<Record<string, unknown>>('/auth/me/export').then((r) => r.data);

export const deleteAccount = (password: string) => api.delete('/auth/me', { data: { password } });

export const myOrders = (params: { limit?: number; offset?: number } = {}) =>
  api.get<{ orders: Order[]; total: number }>('/orders', { params }).then((r) => r.data);
