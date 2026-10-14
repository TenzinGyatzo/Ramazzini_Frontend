import api from '@/lib/axios';

export interface ResultadoBusquedaTrabajador {
  _id: string;
  primerApellido: string;
  segundoApellido: string;
  nombre: string;
  folio: string | null;
  puesto: string | null;
  fechaNacimiento: string | null;
  estadoLaboral: string | null;
  idEmpresa: string;
  nombreEmpresa: string;
  idCentroTrabajo: string;
  nombreCentro: string;
}

/** Mínimo de caracteres (sin espacios) para buscar; el servidor aplica el mismo. */
export const BUSQUEDA_MIN_CARACTERES = 3;

export default {
  /** Trabajadores de todas las empresas y centros que el usuario puede ver. */
  buscar(consulta: string, signal?: AbortSignal) {
    return api.get<ResultadoBusquedaTrabajador[]>('/busqueda/trabajadores', {
      params: { q: consulta },
      signal,
    });
  },
};
