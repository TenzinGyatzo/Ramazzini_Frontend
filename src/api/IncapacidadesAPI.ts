import incapacidades from '@/lib/axiosIncapacidades';
import type {
  CambiosCaso,
  CasoConIncapacidades,
  DatosCaso,
  DatosIncapacidad,
} from '@/helpers/incapacidades';

export default {
  getCasos(trabajadorId: string) {
    return incapacidades.get<CasoConIncapacidades[]>(`/${trabajadorId}`);
  },

  /** Con `idCaso` se agrega a ese caso; con `caso` se abre uno nuevo. */
  registrarIncapacidad(
    trabajadorId: string,
    datos: { idCaso?: string; caso?: DatosCaso; incapacidad: DatosIncapacidad },
  ) {
    return incapacidades.post<CasoConIncapacidades>(`/${trabajadorId}/incapacidad`, datos);
  },

  /** Riesgo de trabajo que no generó incapacidad. */
  abrirCaso(trabajadorId: string, caso: DatosCaso) {
    return incapacidades.post<CasoConIncapacidades>(`/${trabajadorId}/caso`, caso);
  },

  actualizarCaso(trabajadorId: string, idCaso: string, cambios: CambiosCaso) {
    return incapacidades.patch<CasoConIncapacidades>(`/${trabajadorId}/caso/${idCaso}`, cambios);
  },

  eliminarCaso(trabajadorId: string, idCaso: string) {
    return incapacidades.delete(`/${trabajadorId}/caso/${idCaso}`);
  },

  eliminarIncapacidad(trabajadorId: string, idIncapacidad: string) {
    return incapacidades.delete(`/${trabajadorId}/incapacidad/${idIncapacidad}`);
  },
};
