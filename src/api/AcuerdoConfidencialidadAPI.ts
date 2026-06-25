import api from '@/lib/axios';
import type {
  AcuerdoConfidencialidadAcceptResponse,
  AcuerdoConfidencialidadStatus,
} from '@/types/acuerdo-confidencialidad';

export default {
  getStatus(): Promise<{ data: AcuerdoConfidencialidadStatus }> {
    return api.get('/acuerdo-confidencialidad/status');
  },

  accept(): Promise<{ data: AcuerdoConfidencialidadAcceptResponse }> {
    return api.post('/acuerdo-confidencialidad/accept');
  },
};
