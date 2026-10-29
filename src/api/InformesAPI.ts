import { createAxiosClient } from '@/lib/createAxiosClient';

const API_URL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
const informesApi = createAxiosClient(API_URL);

export interface RegistrarExportacionDashboardPayload {
  empresaId: string;
  periodo: string;
  centroTrabajo: string;
  totalTrabajadores?: number;
  /** Qué informe de la ventana «Informes» se generó. */
  tipo?: 'completo' | 'resumen' | 'cardiometabolico' | 'auditivo' | 'musculoesqueletico' | 'excel';
  /** Filtros de población aplicados, en texto; se omite si es toda la plantilla. */
  segmento?: string;
  modo: 'view' | 'download';
}

export default {
  registrarExportacionDashboard(payload: RegistrarExportacionDashboardPayload) {
    return informesApi.post('/informes/dashboard/registrar-exportacion', payload);
  },
};
