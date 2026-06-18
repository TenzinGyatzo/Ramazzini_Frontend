import { type AxiosError } from "axios";
import { createAxiosClient } from './createAxiosClient';
import { getToast } from '@/utils/toast';
import { mapRegulatoryErrorStandalone } from '@/utils/regulatory-error-messages';

const api = createAxiosClient(`${import.meta.env.VITE_API_URL}/api`);

// Interceptor de respuesta para manejar errores regulatorios
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Verificar si es un error regulatorio
    const errorData = error.response?.data as any;
    
    if (errorData?.errorCode) {
      // CONSENT_REQUIRED se maneja mediante modal, no mostrar toast aquí
      if (errorData.errorCode === 'CONSENT_REQUIRED') {
        // El modal se manejará en el composable useDailyConsentGate
        // No mostrar toast para evitar duplicación
        return Promise.reject(error);
      }
      
      // Es un error regulatorio, mapearlo a mensaje UX
      try {
        const toast = getToast();
        const errorMessage = mapRegulatoryErrorStandalone(
          errorData.errorCode,
          errorData.details,
        );
        
        // Mostrar toast según el tipo de error
        toast.open({
          message: errorMessage.message,
          type: errorMessage.type,
          position: 'top-right',
          duration: 5000,
        });
      } catch (mapperError) {
        // Fallback si hay error en el mapper
        console.error('Error mapping regulatory error:', mapperError);
      }
    }
    
    // Re-lanzar el error para que pueda ser manejado en componentes si es necesario
    return Promise.reject(error);
  }
);

export default api;
