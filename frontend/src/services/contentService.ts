import api from './api';
import type { Currency, DeliveryZone, ExchangeRate, ImageAsset, Locale, Page, PublicConfig, Settings } from '../types';

export const getConfig = () => api.get<PublicConfig>('/settings').then((r) => r.data);
export const updateSettings = (payload: Settings) =>
  api.put<{ settings: Settings; changed: string[] }>('/settings', payload).then((r) => r.data);

export const saveZone = (id: number | null, z: Omit<DeliveryZone, 'id'>) =>
  (id ? api.put<{ deliveryZone: DeliveryZone }>(`/settings/delivery-zones/${id}`, z) : api.post<{ deliveryZone: DeliveryZone }>('/settings/delivery-zones', z))
    .then((r) => r.data.deliveryZone);

export const listCurrencies = () => api.get<{ currencies: Currency[]; rates: ExchangeRate[] }>('/currencies').then((r) => r.data);
export const updateCurrency = (code: string, p: Partial<Currency>) => api.put(`/currencies/${code}`, p);
export const rateHistory = (quote?: string) => api.get<{ rates: ExchangeRate[] }>('/currencies/rates', { params: { quote } }).then((r) => r.data.rates);
export const addRate = (p: { quote_code: string; rate: string; rate_type: string; source: string; notes?: string; effective_at?: string }) =>
  api.post<{ rate: ExchangeRate }>('/currencies/rates', p).then((r) => r.data.rate);

export const listImages = (entity_type?: string, entity_id?: number) =>
  api.get<{ images: ImageAsset[] }>('/uploads', { params: { entity_type, entity_id } }).then((r) => r.data.images);

export function uploadImage(file: File, meta: { entity_type: string; entity_id?: number; alt_text?: string; is_primary?: boolean; is_illustrative?: boolean; source?: string; license?: string }) {
  const form = new FormData();
  form.append('image', file);
  for (const [k, v] of Object.entries(meta)) if (v !== undefined && v !== '') form.append(k, String(v));
  return api.post<{ image: ImageAsset }>('/uploads', form).then((r) => r.data.image);
}
export const updateImage = (id: number, p: Partial<ImageAsset>) => api.put<{ image: ImageAsset }>(`/uploads/${id}`, p).then((r) => r.data.image);
export const deleteImage = (id: number) => api.delete(`/uploads/${id}`);

export const getPage = (slug: string, locale: Locale) => api.get<{ page: Page }>(`/pages/${slug}/${locale}`).then((r) => r.data.page);
export const listPages = () => api.get<{ pages: (Page & { has_draft: boolean; updated_by_name?: string })[] }>('/pages').then((r) => r.data.pages);
export const getPageForEdit = (slug: string, locale: Locale) => api.get<{ page: Page }>(`/pages/${slug}/${locale}/edit`).then((r) => r.data.page);
export const saveDraft = (slug: string, locale: Locale, p: { title: string; body: string }) => api.put(`/pages/${slug}/${locale}/draft`, p);
export const publishPage = (slug: string, locale: Locale) => api.post(`/pages/${slug}/${locale}/publish`);
export const discardDraft = (slug: string, locale: Locale) => api.delete(`/pages/${slug}/${locale}/draft`);

export const recordConsent = (p: { consent_id: string; analytics: boolean; marketing: boolean; policy_version: string }) => api.post('/consent', p);
