import { createAxiosClient } from '@/lib/createAxiosClient';

const API_URL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
const informesApi = createAxiosClient(API_URL);

export interface RegistrarExportacionDashboardPayload {
  empresaId: string;
  periodo: string;
  centroTrabajo: string;
  totalTrabajadores?: number;
  /** Qué informe de la ventana «Informes» se generó. */
  tipo?: 'completo' | 'resumen' | 'cardiometabolico' | 'auditivo' | 'musculoesqueletico' | 'excel' | 'relacionConsultas';
  /** Filtros de población aplicados, en texto; se omite si es toda la plantilla. */
  segmento?: string;
  modo: 'view' | 'download';
}

/** Una consulta (nota médica finalizada) de la relación de consultas; textos ya en mayúsculas. */
export interface FilaRelacionConsultas {
  fecha: string;
  /** Cuándo se registró la nota, en ISO: de ahí sale la hora. */
  registradaEn: string | null;
  numeroEmpleado: string;
  primerApellido: string;
  segundoApellido: string;
  nombre: string;
  edad: number | null;
  motivo: string;
  sistema: string;
  codigoDiagnostico: string;
  nombreDiagnostico: string;
  descripcionComplementaria: string;
  tratamiento: string;
  observaciones: string;
  tituloFirmante: string;
  primerApellidoFirmante: string;
  segundoApellidoFirmante: string;
  nombreFirmante: string;
}

export default {
  registrarExportacionDashboard(payload: RegistrarExportacionDashboardPayload) {
    return informesApi.post('/informes/dashboard/registrar-exportacion', payload);
  },

  /** Mismo periodo y filtros de población que el tablero. */
  obtenerRelacionConsultas(
    empresaId: string,
    centroId: string,
    inicio?: string | null,
    fin?: string | null,
    filtros: Record<string, string | string[]> = {},
  ) {
    const params: Record<string, string | string[]> = { ...filtros };
    if (inicio) params.inicio = inicio;
    if (fin) params.fin = fin;
    return informesApi.get<{ filas: FilaRelacionConsultas[] }>(
      `/informes/relacion-consultas/${empresaId}/${centroId}`,
      { params },
    );
  },
};
