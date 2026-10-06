import type {
  CategoriaInsumo,
  EstadoInsumo,
  EstadoLote,
  FilaExistencia,
  Insumo,
  TipoMovimiento,
} from '@/interfaces/inventario.interface';

export const CATEGORIAS_INSUMO: { value: CategoriaInsumo; label: string }[] = [
  { value: 'MEDICAMENTO', label: 'Medicamento' },
  { value: 'MATERIAL_CURACION', label: 'Material de curación' },
  { value: 'PRUEBA_ANTIDOPING', label: 'Prueba antidoping' },
  { value: 'OTRO', label: 'Otro' },
];

export const PARAMETROS_ANTIDOPING = [2, 3, 5, 6, 10, 12];

export const MOTIVOS_BAJA = ['Caducidad', 'Daño', 'Merma', 'Otro'];

export function etiquetaCategoria(categoria: string): string {
  return CATEGORIAS_INSUMO.find((c) => c.value === categoria)?.label ?? categoria;
}

const ESTADOS_INSUMO: Record<EstadoInsumo, { label: string; clase: string }> = {
  DISPONIBLE: {
    label: 'Disponible',
    clase: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  BAJO: {
    label: 'Bajo stock',
    clase: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  AGOTADO: { label: 'Agotado', clase: 'bg-red-50 text-red-700 border-red-200' },
};

export function estadoInsumoVisual(estado: EstadoInsumo) {
  return ESTADOS_INSUMO[estado] ?? ESTADOS_INSUMO.DISPONIBLE;
}

const ESTADOS_LOTE: Record<EstadoLote, { label: string; clase: string }> = {
  VIGENTE: { label: 'Vigente', clase: 'text-gray-600' },
  POR_CADUCAR: { label: 'Por caducar', clase: 'text-amber-600 font-medium' },
  CADUCADO: { label: 'Caducado', clase: 'text-red-600 font-medium' },
};

export function estadoLoteVisual(estado: EstadoLote) {
  return ESTADOS_LOTE[estado] ?? ESTADOS_LOTE.VIGENTE;
}

const TIPOS_MOVIMIENTO: Record<TipoMovimiento, string> = {
  ENTRADA: 'Entrada',
  CONSUMO_CLINICO: 'Consumo clínico',
  REVERSA_CONSUMO: 'Reversa de consumo',
  AJUSTE_POSITIVO: 'Ajuste positivo',
  AJUSTE_NEGATIVO: 'Ajuste negativo',
  BAJA: 'Baja',
};

export function etiquetaMovimiento(tipo: string): string {
  return TIPOS_MOVIMIENTO[tipo as TipoMovimiento] ?? tipo;
}

/** «+100» / «−2»: el signo se muestra siempre. */
export function cantidadConSigno(cantidad: number): string {
  return cantidad > 0 ? `+${cantidad}` : `−${Math.abs(cantidad)}`;
}

/** Las caducidades se guardan a medianoche UTC: se formatean sin zona horaria. */
export function formatearCaducidad(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [anio, mes, dia] = valor.slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '—';
}

export function formatearFechaHora(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** «97 tabletas»: pluraliza la unidad de forma sencilla. */
export function cantidadConUnidad(cantidad: number, unidad: string): string {
  const singular = Math.abs(cantidad) === 1;
  if (singular || /s$/i.test(unidad)) return `${cantidad} ${unidad}`;
  return `${cantidad} ${unidad}${/[aeiouáéíóú]$/i.test(unidad) ? 's' : 'es'}`;
}

export function loteVisible(lote: string | undefined | null): string {
  return lote ? lote : 'Sin lote';
}

export type FiltroExistencias =
  | 'TODOS'
  | CategoriaInsumo
  | 'BAJO_STOCK'
  | 'POR_CADUCAR';

export function filtrarExistencias(
  filas: FilaExistencia[],
  filtro: FiltroExistencias,
  busqueda: string,
): FilaExistencia[] {
  const texto = busqueda.trim().toLowerCase();
  return filas.filter((fila) => {
    if (texto && !fila.insumo.nombre.toLowerCase().includes(texto)) return false;
    switch (filtro) {
      case 'TODOS':
        return true;
      case 'BAJO_STOCK':
        return fila.estado !== 'DISPONIBLE';
      case 'POR_CADUCAR':
        return fila.lotesPorCaducar > 0 || fila.lotesCaducados > 0;
      default:
        return fila.insumo.categoria === filtro;
    }
  });
}

export function insumoVacio(): Omit<Insumo, '_id'> {
  return {
    nombre: '',
    categoria: 'MEDICAMENTO',
    unidad: '',
    presentacion: '',
    unidadesPorPresentacion: 1,
    stockMinimo: 0,
    controlaLote: false,
    controlaCaducidad: false,
    parametrosAntidoping: undefined,
    activo: true,
  };
}
