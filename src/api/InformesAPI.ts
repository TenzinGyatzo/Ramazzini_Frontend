import { createAxiosClient } from '@/lib/createAxiosClient';

const API_URL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
const informesApi = createAxiosClient(API_URL);

export interface RegistrarExportacionDashboardPayload {
  empresaId: string;
  periodo: string;
  centroTrabajo: string;
  totalTrabajadores?: number;
  modo: 'view' | 'download';
}

export default {
  registrarExportacionDashboard(payload: RegistrarExportacionDashboardPayload) {
    return informesApi.post('/informes/dashboard/registrar-exportacion', payload);
  },
};
