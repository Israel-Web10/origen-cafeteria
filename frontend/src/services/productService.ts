import api from './api';
import type { Product } from '../types';

export async function listProducts(params?: { category_id?: number; search?: string }): Promise<Product[]> {
  const { data } = await api.get<{ products: Product[] }>('/products', { params });
  return data.products;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await api.get<{ product: Product }>(`/products/${id}`);
  return data.product;
}

export async function createProduct(payload: Partial<Product>): Promise<Product> {
  const { data } = await api.post<{ product: Product }>('/products', payload);
  return data.product;
}

export async function updateProduct(id: number, payload: Partial<Product>): Promise<Product> {
  const { data } = await api.put<{ product: Product }>(`/products/${id}`, payload);
  return data.product;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}
