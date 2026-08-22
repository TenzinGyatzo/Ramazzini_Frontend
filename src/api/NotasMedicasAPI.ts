import api from '@/lib/axios';

export default {
  getBorradoresPendientes() {
    return api.get('/expedientes/notas-medicas/borradores-pendientes');
  },

  getContextoCex(params: {
    trabajadorId: string;
    fechaNotaMedica: string;
    excludeDocumentoId?: string;
  }) {
    return api.get('/expedientes/notas-medicas/contexto-cex', { params });
  },
};
