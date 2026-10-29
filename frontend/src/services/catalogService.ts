import api from './api';
import type { Category, Product, Promotion } from '../types';

export interface ProductQuery {
  category?: string;
  search?: string;
  sort?: 'recommended' | 'name' | 'price_asc' | 'price_desc' | 'popular' | 'newest';
  featured?: boolean;
  new?: boolean;
  promo?: boolean;
  include_inactive?: boolean;
  limit?: number;
}

export const listCategories = (includeInactive = false) =>
  api.get<{ categories: Category[] }>('/categories', { params: includeInactive ? { include_inactive: true } : {} }).then((r) => r.data.categories);
export const getCategory = (slug: string) => api.get<{ category: Category }>(`/categories/${slug}`).then((r) => r.data.category);
export const createCategory = (p: Partial<Category>) => api.post<{ category: Category }>('/categories', p).then((r) => r.data.category);
export const updateCategory = (id: number, p: Partial<Category>) => api.put<{ category: Category }>(`/categories/${id}`, p).then((r) => r.data.category);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}`);

export const listProducts = (params: ProductQuery = {}) =>
  api.get<{ products: Product[] }>('/products', { params }).then((r) => r.data.products);
export const getProduct = (idOrSlug: string | number) => api.get<{ product: Product }>(`/products/${idOrSlug}`).then((r) => r.data.product);
export const createProduct = (p: Record<string, unknown>) => api.post<{ product: Product }>('/products', p).then((r) => r.data.product);
export const updateProduct = (id: number, p: Record<string, unknown>) => api.put<{ product: Product }>(`/products/${id}`, p).then((r) => r.data.product);
export const deleteProduct = (id: number) => api.delete<{ deleted?: boolean; deactivated?: boolean }>(`/products/${id}`).then((r) => r.data);
export const setComponents = (id: number, components: { inventory_item_id: number; variant_id?: number | null; quantity: number }[]) =>
  api.put<{ product: Product }>(`/products/${id}/components`, { components }).then((r) => r.data.product);

export const listPromotions = (all = false) =>
  api.get<{ promotions: Promotion[] }>('/promotions', { params: all ? { all: true } : {} }).then((r) => r.data.promotions);
export const savePromotion = (id: number | null, p: Record<string, unknown>) =>
  (id ? api.put<{ promotion: Promotion }>(`/promotions/${id}`, p) : api.post<{ promotion: Promotion }>('/promotions', p)).then((r) => r.data.promotion);
