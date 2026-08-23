import api from './api';
import type { Settings, DeliveryZone } from '../types';

export async function getSettings(): Promise<{ settings: Settings; deliveryZones: DeliveryZone[] }> {
  const { data } = await api.get<{ settings: Settings; deliveryZones: DeliveryZone[] }>('/settings');
  return data;
}

export async function updateSettings(payload: Partial<Settings>): Promise<Settings> {
  const { data } = await api.put<{ settings: Settings }>('/settings', payload);
  return data.settings;
}

export async function createDeliveryZone(payload: Partial<DeliveryZone>): Promise<DeliveryZone> {
  const { data } = await api.post<{ deliveryZone: DeliveryZone }>('/settings/delivery-zones', payload);
  return data.deliveryZone;
}

export async function updateDeliveryZone(id: number, payload: Partial<DeliveryZone>): Promise<DeliveryZone> {
  const { data } = await api.put<{ deliveryZone: DeliveryZone }>(`/settings/delivery-zones/${id}`, payload);
  return data.deliveryZone;
}
