import { createAxiosClient } from './createAxiosClient';

const tecnicoFirmante = createAxiosClient(
  `${import.meta.env.VITE_API_URL}/tecnicos-firmantes`,
);

// Adjuntar el token a todas las solicitudes (requerido para audit y autorización en backend)
tecnicoFirmante.interceptors.request.use((config) => {
  const token = localStorage.getItem("AUTH_TOKEN");
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default tecnicoFirmante;
