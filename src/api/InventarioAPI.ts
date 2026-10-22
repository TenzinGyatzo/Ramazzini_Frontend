import api from '@/lib/axios';
import type {
  ConfiguracionInventario,
  DetalleInsumo,
  EmpresaCentrosInventario,
  FilaCargaMasiva,
  FilaExistencia,
  Insumo,
  InsumoPayload,
  InsumoSugerido,
  PaginaMovimientos,
  ReporteConsumo,
  ResumenCargaMasiva,
} from '@/interfaces/inventario.interface';

const centro = (centroId: string) => `/inventario/centros/${centroId}`;

export default {
  getConfiguracion() {
    return api.get<ConfiguracionInventario>('/inventario/configuracion');
  },

  updateConfiguracion(data: Partial<ConfiguracionInventario>) {
    return api.patch<ConfiguracionInventario>('/inventario/configuracion', data);
  },

  /** Empresas y centros del proveedor, con los que llevan inventario (solo el Principal). */
  getCentros() {
    return api.get<EmpresaCentrosInventario[]>('/inventario/centros');
  },

  updateCentros(cambios: { idCentroTrabajo: string; inventarioHabilitado: boolean }[]) {
    return api.patch<EmpresaCentrosInventario[]>('/inventario/centros', { cambios });
  },

  getInsumos() {
    return api.get<Insumo[]>('/inventario/insumos');
  },

  createInsumo(data: InsumoPayload) {
    return api.post<Insumo>('/inventario/insumos', data);
  },

  getListaSugerida() {
    return api.get<InsumoSugerido[]>('/inventario/insumos/lista-sugerida');
  },

  cargarListaSugerida(nombres: string[]) {
    return api.post<{ agregados: number }>(
      '/inventario/insumos/lista-sugerida',
      { nombres },
    );
  },

  updateInsumo(insumoId: string, data: Partial<InsumoPayload>) {
    return api.patch<Insumo>(`/inventario/insumos/${insumoId}`, data);
  },

  getExistencias(centroId: string) {
    return api.get<FilaExistencia[]>(`${centro(centroId)}/existencias`);
  },

  getDetalleInsumo(centroId: string, insumoId: string) {
    return api.get<DetalleInsumo>(`${centro(centroId)}/insumos/${insumoId}`);
  },

  getMovimientos(
    centroId: string,
    params: {
      idInsumo?: string;
      tipo?: string;
      desde?: string;
      hasta?: string;
      pagina?: number;
    } = {},
  ) {
    return api.get<PaginaMovimientos>(`${centro(centroId)}/movimientos`, {
      params,
    });
  },

  getConsumo(centroId: string, params: { desde: string; hasta: string }) {
    return api.get<ReporteConsumo>(`${centro(centroId)}/consumo`, { params });
  },

  registrarEntrada(
    centroId: string,
    data: {
      idInsumo: string;
      cantidad: number;
      porPresentacion?: boolean;
      lote?: string;
      caducidad?: string;
    },
  ) {
    return api.post(`${centro(centroId)}/entradas`, data);
  },

  entradasMasivas(
    centroId: string,
    data: { simular?: boolean; filas: FilaCargaMasiva[] },
  ) {
    return api.post<ResumenCargaMasiva>(
      `${centro(centroId)}/entradas-masivas`,
      data,
    );
  },

  ajustarExistencia(
    centroId: string,
    data: { idLote: string; existenciaContada: number; motivo: string },
  ) {
    return api.post(`${centro(centroId)}/ajustes`, data);
  },

  darDeBaja(
    centroId: string,
    data: {
      idLote: string;
      cantidad: number;
      motivo: string;
      observaciones?: string;
    },
  ) {
    return api.post(`${centro(centroId)}/bajas`, data);
  },
};
