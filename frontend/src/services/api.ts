import axios, { AxiosError } from 'axios';
import i18n from '../i18n';

// En producción la API puede estar en el mismo dominio (/api) o en otro (VITE_API_URL).
// Nunca se incrusta "localhost" en el build de producción.
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
export const API_ORIGIN = API_URL.startsWith('http') ? new URL(API_URL).origin : '';

export const TOKEN_KEY = 'origen_token';

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export class ApiError extends Error {
  code: string;
  status: number;
  details?: { fields?: { field: string; message: string }[] };
  constructor(message: string, code: string, status: number, details?: ApiError['details']) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Traduce el `code` estable del backend; si no hay traducción, usa el mensaje del servidor.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; code?: string; details?: ApiError['details'] }>) => {
    const status = error.response?.status ?? 0;
    const code = error.response?.data?.code || (status === 0 ? 'network_error' : 'error');
    const key = `errors.${code}`;
    const fallback = error.response?.data?.error || i18n.t('errors.generic');
    const message = i18n.exists(key) ? i18n.t(key) : fallback;
    if (code === 'session_expired') {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('origen:session-expired'));
    }
    return Promise.reject(new ApiError(message, code, status, error.response?.data?.details));
  }
);

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : i18n.t('errors.generic');
}

/** URL absoluta de un archivo subido (/uploads/public/...) o de un recurso del frontend (/media/...). */
export function assetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url) || url.startsWith('/media/')) return url;
  return `${API_ORIGIN}${url}`;
}

/** Descarga un archivo protegido (reportes, comprobantes) usando el token. */
export async function downloadFile(path: string, params: Record<string, unknown>, fallbackName: string) {
  const res = await api.get(path, { params, responseType: 'blob', timeout: 120000 });
  const disposition = String(res.headers['content-disposition'] || '');
  const match = /filename="([^"]+)"/.exec(disposition);
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = match?.[1] || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function fetchBlobUrl(path: string): Promise<string> {
  const res = await api.get(path, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
}

export default api;
