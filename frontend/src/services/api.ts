import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_URL });

// Adjunta el token JWT guardado en localStorage a cada request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('origen_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normaliza los mensajes de error del backend para mostrarlos fácilmente.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Ocurrió un error inesperado. Intenta nuevamente.';
    return Promise.reject(new Error(message));
  }
);

export default api;
