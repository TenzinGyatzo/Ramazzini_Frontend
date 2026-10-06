export type CategoriaInsumo =
  | 'MEDICAMENTO'
  | 'MATERIAL_CURACION'
  | 'PRUEBA_ANTIDOPING'
  | 'OTRO';

export type EstadoInsumo = 'AGOTADO' | 'BAJO' | 'DISPONIBLE';
export type EstadoLote = 'CADUCADO' | 'POR_CADUCAR' | 'VIGENTE';

export type TipoMovimiento =
  | 'ENTRADA'
  | 'CONSUMO_CLINICO'
  | 'REVERSA_CONSUMO'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'BAJA';

export interface Insumo {
  _id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  /** Unidad mínima de consumo; las existencias se llevan en ella. */
  unidad: string;
  presentacion?: string;
  unidadesPorPresentacion: number;
  stockMinimo: number;
  controlaLote: boolean;
  controlaCaducidad: boolean;
  parametrosAntidoping?: number;
  activo: boolean;
}

export type InsumoPayload = Omit<Insumo, '_id' | 'activo'> & {
  activo?: boolean;
};

/** Insumo de la lista sugerida; `yaExiste` = el proveedor ya lo tiene en su catálogo. */
export interface InsumoSugerido {
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: string;
  controlaLote: boolean;
  controlaCaducidad: boolean;
  parametrosAntidoping?: number;
  yaExiste: boolean;
}

export interface ResumenExistencia {
  existencia: number;
  estado: EstadoInsumo;
  caducidadProxima: string | null;
  lotesPorCaducar: number;
  lotesCaducados: number;
}

export interface FilaExistencia extends ResumenExistencia {
  insumo: Insumo;
}

export interface LoteInventario {
  _id: string;
  lote: string;
  caducidad: string | null;
  existencia: number;
  estado: EstadoLote;
}

export interface MovimientoInventario {
  _id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;
  motivo?: string;
  origenTipo: string;
  idInsumo?: { _id: string; nombre: string; unidad: string } | string;
  idLote?: { _id: string; lote: string; caducidad: string | null } | string;
  idUsuario?: { _id: string; username: string } | string;
}

export interface DetalleInsumo extends ResumenExistencia {
  insumo: Insumo;
  lotes: LoteInventario[];
  movimientos: MovimientoInventario[];
}

export interface ConfiguracionInventario {
  inventarioHabilitado: boolean;
  inventarioDiasAvisoCaducidad: number;
  /** Cada antidoping descuenta una prueba del inventario. */
  inventarioControlaAntidoping?: boolean;
}

export interface PaginaMovimientos {
  total: number;
  pagina: number;
  porPagina: number;
  movimientos: MovimientoInventario[];
}

export interface FilaConsumo {
  insumo: Pick<Insumo, '_id' | 'nombre' | 'unidad' | 'categoria'>;
  entradas: number;
  /** Consumo clínico neto: lo descontado por documentos menos lo devuelto. */
  consumo: number;
  /** Parte del consumo administrada en consulta. */
  administrado: number;
  /** Parte del consumo entregada al trabajador. */
  entregado: number;
  bajas: number;
  /** Ajustes netos por conteo. */
  ajustes: number;
}

export interface ReporteConsumo {
  desde: string;
  hasta: string;
  filas: FilaConsumo[];
}
