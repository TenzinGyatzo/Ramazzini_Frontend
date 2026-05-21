import api from '@/lib/axios';

const baseUrl = (trabajadorId: string) =>
  `/expedientes/${trabajadorId}/seguimientos-programados-cardiometabolicos`;

export default {
  list(trabajadorId: string) {
    return api.get(baseUrl(trabajadorId));
  },

  getById(trabajadorId: string, id: string) {
    return api.get(`${baseUrl(trabajadorId)}/${id}`);
  },

  create(trabajadorId: string, data: Record<string, unknown>) {
    return api.post(baseUrl(trabajadorId), data);
  },

  update(trabajadorId: string, id: string, data: Record<string, unknown>) {
    return api.patch(`${baseUrl(trabajadorId)}/${id}`, data);
  },

  remove(trabajadorId: string, id: string) {
    return api.delete(`${baseUrl(trabajadorId)}/${id}`);
  },
};
