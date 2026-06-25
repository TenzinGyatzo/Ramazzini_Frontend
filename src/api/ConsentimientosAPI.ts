import api from '@/lib/axios';
import type {
  ConsentimientoStatus,
  ConsentimientoCreated,
  CreateConsentimientoDto,
} from '@/types/consentimiento';

export default {
  getStatus(trabajadorId: string): Promise<{ data: ConsentimientoStatus }> {
    return api.get(`/consentimientos/status/${trabajadorId}`);
  },

  create(
    createDto: CreateConsentimientoDto,
  ): Promise<{ data: ConsentimientoCreated }> {
    return api.post('/consentimientos', createDto);
  },
};
