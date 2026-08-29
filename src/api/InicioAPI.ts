import api from '@/lib/axios';
import type {
  InicioHoyCentroItem,
  InicioHoyDocumentoItem,
  InicioHoyListResponse,
  InicioHoyTrabajadorItem,
  InicioResumen,
} from '@/interfaces/inicio-resumen.interface';

export default {
  getResumen(signal?: AbortSignal) {
    return api.get<InicioResumen>('/inicio/resumen', { signal });
  },
  getHoyTrabajadores(signal?: AbortSignal) {
    return api.get<InicioHoyListResponse<InicioHoyTrabajadorItem>>(
      '/inicio/hoy/trabajadores',
      { signal },
    );
  },
  getHoyDocumentos(signal?: AbortSignal) {
    return api.get<InicioHoyListResponse<InicioHoyDocumentoItem>>(
      '/inicio/hoy/documentos',
      { signal },
    );
  },
  getHoyCentros(signal?: AbortSignal) {
    return api.get<InicioHoyListResponse<InicioHoyCentroItem>>(
      '/inicio/hoy/centros',
      { signal },
    );
  },
};
