import api from '@/lib/axios';

/** Vigencias de aptitud de todas las empresas (docs/vigencias-globales-especificacion.md). */
export interface ConteosVigencia {
  activos: number;
  vigentes: number;
  porVencer: number;
  vencidasRecientes: number;
  vencidasAntiguas: number;
  sinAptitud: number;
  /** Aptitudes que vencen en 1–30, 31–60 y 61–90 días. */
  vencen30: number;
  vencen60: number;
  vencen90: number;
}

export type EstadoSeguimiento = 'EN_SEGUIMIENTO' | 'REACTIVADA' | 'SIN_ACTIVIDAD' | 'PAUSADA';

export type MotivoPausa = 'NO_RENOVO' | 'CAMBIO_PROVEEDOR' | 'SERVICIO_MEDICO_PROPIO' | 'OTRO';

export interface CentroVigencias {
  idCentro: string;
  nombreCentro: string;
  conteos: ConteosVigencia;
}

export interface EmpresaVigencias {
  idEmpresa: string;
  nombreEmpresa: string;
  seguimiento: EstadoSeguimiento;
  pausa?: {
    desde: string | null;
    motivo: MotivoPausa | null;
    motivoOtro: string | null;
    nota: string | null;
    pausadoPor: string | null;
  };
  reactivadoEn: string | null;
  ultimaAptitud: string | null;
  conteos: ConteosVigencia;
  centros: CentroVigencias[];
}

export interface ResumenVigencias {
  generadoEn: string;
  /** Solo empresas en seguimiento (también las reactivadas). */
  totales: ConteosVigencia;
  conteosSecundarios: {
    sinActividad: number;
    pausadas: number;
    sinTrabajadoresActivos: number;
  };
  puedePausar: boolean;
  puedeExportar: boolean;
  /** Ordenadas por urgencia. */
  empresas: EmpresaVigencias[];
}

export type EstadoPendiente = 'POR_VENCER' | 'VENCIDA_RECIENTE' | 'VENCIDA_ANTIGUA';

export interface PendienteVigencia {
  idTrabajador: string;
  nombreCentro: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  numeroEmpleado: string;
  puesto: string;
  fechaUltimaAptitud: string | null;
  fechaVencimiento: string | null;
  /** null = sin aptitud. */
  estado: EstadoPendiente | null;
  /** Restantes (positivo) o vencidos (negativo); null sin aptitud. */
  diasRestantes: number | null;
}

export interface PausaSeguimiento {
  motivo: MotivoPausa;
  motivoOtro?: string;
  nota?: string;
}

export default {
  getResumen(): Promise<{ data: ResumenVigencias }> {
    return api.get('/vigencias-aptitud/resumen');
  },

  pausar(idEmpresa: string, pausa: PausaSeguimiento) {
    return api.patch(`/vigencias-aptitud/empresas/${idEmpresa}/seguimiento`, { pausar: true, ...pausa });
  },

  reanudar(idEmpresa: string) {
    return api.patch(`/vigencias-aptitud/empresas/${idEmpresa}/seguimiento`, { pausar: false });
  },

  /** El servidor registra la exportación en la bitácora al entregar las filas. */
  getPendientes(idEmpresa: string): Promise<{ data: PendienteVigencia[] }> {
    return api.get(`/vigencias-aptitud/empresas/${idEmpresa}/pendientes`);
  },
};
