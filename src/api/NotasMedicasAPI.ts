import api from '@/lib/axios';

export default {
  getBorradoresPendientes() {
    return api.get('/expedientes/notas-medicas/borradores-pendientes');
  },
};
