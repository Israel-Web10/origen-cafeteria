import api from './api';

export interface UploadedImage {
  id: number;
  entity_type: string;
  entity_id: number | null;
  url: string;
  alt_text?: string;
  is_primary: boolean;
}

export async function uploadImage(
  file: File,
  meta: { entity_type: string; entity_id?: number; alt_text?: string; is_primary?: boolean }
): Promise<UploadedImage> {
  const form = new FormData();
  form.append('image', file);
  form.append('entity_type', meta.entity_type);
  if (meta.entity_id) form.append('entity_id', String(meta.entity_id));
  if (meta.alt_text) form.append('alt_text', meta.alt_text);
  if (meta.is_primary) form.append('is_primary', 'true');

  const { data } = await api.post<{ image: UploadedImage }>('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.image;
}

export async function listImages(entityType?: string): Promise<UploadedImage[]> {
  const { data } = await api.get<{ images: UploadedImage[] }>('/uploads', { params: { entity_type: entityType } });
  return data.images;
}

export async function deleteImage(id: number): Promise<void> {
  await api.delete(`/uploads/${id}`);
}

/** Devuelve la URL absoluta de una imagen guardada en el backend (ej: /uploads/x.jpg) */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
  return `${base}${url}`;
}
