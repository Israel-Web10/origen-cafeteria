import api from './api';
import type { Category } from '../types';

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<{ categories: Category[] }>('/categories');
  return data.categories;
}

export async function createCategory(payload: Partial<Category>): Promise<Category> {
  const { data } = await api.post<{ category: Category }>('/categories', payload);
  return data.category;
}

export async function updateCategory(id: number, payload: Partial<Category>): Promise<Category> {
  const { data } = await api.put<{ category: Category }>(`/categories/${id}`, payload);
  return data.category;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}
