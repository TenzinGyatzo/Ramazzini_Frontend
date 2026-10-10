/**
 * Tablero de salud: resumen del inventario clínico de los centros que se ven.
 * Usa los reportes que ya entrega el inventario por centro de trabajo
 * (consumo del periodo y existencias de hoy) y los suma por insumo.
 */
import type { FilaConsumo, FilaExistencia, ReporteConsumo } from '@/interfaces/inventario.interface';

/** El reporte de consumo exige un periodo: sin uno elegido se toma el año en curso. */
export function periodoDeInventario(
  inicio: string | null | undefined,
  fin: string | null | undefined,
  hoy: string,
): { desde: string; hasta: string; porDefecto: boolean } {
  if (inicio && fin && inicio <= fin) return { desde: inicio, hasta: fin, porDefecto: false };
  return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy, porDefecto: true };
}

const CAMPOS = ['entradas', 'consumo', 'administrado', 'entregado', 'bajas', 'ajustes'] as const;

/** Suma por insumo el consumo de varios centros; del más al menos consumido. */
export function sumarConsumo(reportes: (ReporteConsumo | null | undefined)[]): FilaConsumo[] {
  const porInsumo = new Map<string, FilaConsumo>();
  for (const reporte of reportes) {
    for (const fila of reporte?.filas ?? []) {
      const clave = String(fila.insumo._id);
      const suma =
        porInsumo.get(clave) ??
        ({ insumo: fila.insumo, entradas: 0, consumo: 0, administrado: 0, entregado: 0, bajas: 0, ajustes: 0 } as FilaConsumo);
      for (const campo of CAMPOS) suma[campo] += fila[campo] ?? 0;
      porInsumo.set(clave, suma);
    }
  }
  return [...porInsumo.values()].sort(
    (a, b) => b.consumo - a.consumo || a.insumo.nombre.localeCompare(b.insumo.nombre, 'es'),
  );
}

export interface AlertasDeExistencias {
  /** Insumos con existencia mínima definida que están en cero. */
  agotados: number;
  /** Insumos por debajo de su existencia mínima. */
  bajoMinimo: number;
  lotesPorCaducar: number;
  lotesCaducados: number;
  /** Insumos con existencia en al menos un centro. */
  conExistencia: number;
}

/**
 * Alertas de las existencias de hoy. Con varios centros cuenta cada insumo en
 * cada centro: el mismo insumo agotado en dos centros son dos alertas.
 */
export function alertasDeExistencias(
  existencias: (FilaExistencia[] | null | undefined)[],
): AlertasDeExistencias {
  const alertas: AlertasDeExistencias = {
    agotados: 0,
    bajoMinimo: 0,
    lotesPorCaducar: 0,
    lotesCaducados: 0,
    conExistencia: 0,
  };
  const conExistencia = new Set<string>();
  for (const filas of existencias) {
    for (const fila of filas ?? []) {
      // Sin mínimo definido, estar en cero no es una alerta: quizá ese centro no lo maneja
      if (fila.estado === 'AGOTADO' && (fila.insumo.stockMinimo ?? 0) > 0) alertas.agotados++;
      if (fila.estado === 'BAJO') alertas.bajoMinimo++;
      alertas.lotesPorCaducar += fila.lotesPorCaducar ?? 0;
      alertas.lotesCaducados += fila.lotesCaducados ?? 0;
      if (fila.existencia > 0) conExistencia.add(String(fila.insumo._id));
    }
  }
  alertas.conExistencia = conExistencia.size;
  return alertas;
}

export const hayAlertas = (alertas: AlertasDeExistencias) =>
  alertas.agotados + alertas.bajoMinimo + alertas.lotesPorCaducar + alertas.lotesCaducados > 0;
