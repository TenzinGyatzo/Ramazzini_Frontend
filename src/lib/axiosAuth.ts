import { createAxiosClient } from './createAxiosClient';

const auth = createAxiosClient(`${import.meta.env.VITE_API_URL}/auth`);

// Adjuntar automáticamente el token a todas las solicitudes (auth/users, permisos, etc.)
auth.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("AUTH_TOKEN");
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

export default auth;
