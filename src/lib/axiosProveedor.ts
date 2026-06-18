import { createAxiosClient } from './createAxiosClient';

const proveedor = createAxiosClient(
  `${import.meta.env.VITE_API_URL}/proveedores-salud`,
);

// Adjuntar automáticamente el token a todas las solicitudes
proveedor.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('AUTH_TOKEN');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

export default proveedor;
