import api from '@/lib/axios';

/** Vigencias de aptitud de las empresas en seguimiento (docs/vigencias-globales-especificacion.md). */
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

export interface CentroVigencias {
  idCentro: string;
  nombreCentro: string;
  conteos: ConteosVigencia;
}

export interface EmpresaVigencias {
  idEmpresa: string;
  nombreEmpresa: string;
  ultimaAptitud: string | null;
  conteos: ConteosVigencia;
  centros: CentroVigencias[];
}

export interface ResumenVigencias {
  generadoEn: string;
  /** Solo las empresas en seguimiento que ve el usuario. */
  totales: ConteosVigencia;
  empresasSeleccionadas: number;
  puedeElegir: boolean;
  puedeExportar: boolean;
  /** Ordenadas por urgencia. */
  empresas: EmpresaVigencias[];
}

/** Empresa de la ventana «Elegir empresas». */
export interface EmpresaParaElegir {
  idEmpresa: string;
  nombreEmpresa: string;
  seleccionada: boolean;
  activos: number;
  ultimaAptitud: string | null;
}

export interface CambioSeleccion {
  idEmpresa: string;
  seleccionada: boolean;
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

export default {
  getResumen(): Promise<{ data: ResumenVigencias }> {
    return api.get('/vigencias-aptitud/resumen');
  },

  /** Empresas que ve el usuario y si están en seguimiento (quien puede elegir). */
  getEmpresas(): Promise<{ data: EmpresaParaElegir[] }> {
    return api.get('/vigencias-aptitud/empresas');
  },

  /** Envía solo los cambios; devuelve la lista actualizada. */
  actualizarEmpresas(cambios: CambioSeleccion[]): Promise<{ data: EmpresaParaElegir[] }> {
    return api.patch('/vigencias-aptitud/empresas', { cambios });
  },

  /** El servidor registra la exportación en la bitácora al entregar las filas. */
  getPendientes(idEmpresa: string): Promise<{ data: PendienteVigencia[] }> {
    return api.get(`/vigencias-aptitud/empresas/${idEmpresa}/pendientes`);
  },
};
