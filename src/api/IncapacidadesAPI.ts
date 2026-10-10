import incapacidades from '@/lib/axiosIncapacidades';
import incapacidadesEmpresa from '@/lib/axiosIncapacidadesEmpresa';
import type {
  CambiosCaso,
  CasoConIncapacidades,
  DatosCaso,
  DatosIncapacidad,
} from '@/helpers/incapacidades';
import type { PanelIncapacidades } from '@/helpers/incapacidadesPanel';
import type { InformeIncapacidades } from '@/helpers/incapacidadesInforme';
import type { CriterioPrima, Siniestralidad } from '@/helpers/incapacidadesPrima';

export default {
  /** Seguimiento de la empresa: incapacitados hoy, focos rojos y casos. */
  getPanelEmpresa(empresaId: string) {
    return incapacidadesEmpresa.get<PanelIncapacidades>(`/${empresaId}`);
  },

  /** Totales, indicadores y tendencias de un periodo (fechas AAAA-MM-DD). */
  getInformeEmpresa(
    empresaId: string,
    filtros: { desde: string; hasta: string; centro?: string },
  ) {
    return incapacidadesEmpresa.get<InformeIncapacidades>(`/${empresaId}/informe`, {
      params: filtros,
    });
  },

  /** S, I y D de un año para estimar la prima de riesgo de trabajo. */
  getPrimaEmpresa(
    empresaId: string,
    filtros: { anio: number; criterio: CriterioPrima; centro?: string },
  ) {
    return incapacidadesEmpresa.get<Siniestralidad>(`/${empresaId}/prima`, {
      params: filtros,
    });
  },

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
