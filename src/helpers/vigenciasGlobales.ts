/**
 * Vista «Vigencias» (docs/vigencias-globales-especificacion.md): filtros, orden y textos.
 * Los conteos llegan calculados del servidor, con los mismos cortes que la tabla.
 */
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import type {
  CambioSeleccion,
  ConteosVigencia,
  EmpresaParaElegir,
  EmpresaVigencias,
  EstadoPendiente,
  PendienteVigencia,
} from '@/api/VigenciasAptitudAPI';

/** Vigentes + por vencer, sobre activos. null sin activos. */
export function porcentajeAlDia(conteos: ConteosVigencia): number | null {
  if (!conteos.activos) return null;
  return Math.round(((conteos.vigentes + conteos.porVencer) / conteos.activos) * 100);
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export function coincideEmpresa(empresa: { nombreEmpresa: string }, busqueda: string): boolean {
  const consulta = normalizar(busqueda);
  return !consulta || normalizar(empresa.nombreEmpresa).includes(consulta);
}

export type OrdenVigencias = 'urgencia' | 'alDia' | 'nombre';

export const ORDENES: { valor: OrdenVigencias; texto: string }[] = [
  { valor: 'urgencia', texto: 'Más urgentes primero' },
  { valor: 'alDia', texto: 'Menos al día primero' },
  { valor: 'nombre', texto: 'Por nombre' },
];

const urgencia = (c: ConteosVigencia) => c.vencidasRecientes + c.porVencer;
const porNombre = (a: EmpresaVigencias, b: EmpresaVigencias) =>
  a.nombreEmpresa.localeCompare(b.nombreEmpresa, 'es');

/** Mismo orden por urgencia que el servidor: las vencidas antiguas no cuentan. */
export function ordenarEmpresas(empresas: EmpresaVigencias[], orden: OrdenVigencias): EmpresaVigencias[] {
  const copia = [...empresas];
  if (orden === 'nombre') return copia.sort(porNombre);
  if (orden === 'alDia') {
    return copia.sort(
      (a, b) => (porcentajeAlDia(a.conteos) ?? 101) - (porcentajeAlDia(b.conteos) ?? 101) || porNombre(a, b),
    );
  }
  return copia.sort(
    (a, b) =>
      urgencia(b.conteos) - urgencia(a.conteos) ||
      b.conteos.sinAptitud - a.conteos.sinAptitud ||
      porNombre(a, b),
  );
}

export interface FiltrosVigencias {
  busqueda: string;
  orden: OrdenVigencias;
}

/** Empresas de la lista: buscador y orden. Se muestran todas las elegidas, también las que están al día. */
export function filtrarEmpresas(empresas: EmpresaVigencias[], filtros: FiltrosVigencias): EmpresaVigencias[] {
  return ordenarEmpresas(
    empresas.filter((e) => coincideEmpresa(e, filtros.busqueda)),
    filtros.orden,
  );
}

// ---- Elegir empresas

export type OrdenParaElegir = 'nombre' | 'ultimaAptitud';

/** Lista de la ventana «Elegir empresas»: buscador y orden (por nombre o última aptitud más reciente). */
export function filtrarParaElegir(
  empresas: EmpresaParaElegir[],
  busqueda: string,
  orden: OrdenParaElegir,
): EmpresaParaElegir[] {
  const lista = empresas.filter((e) => coincideEmpresa(e, busqueda));
  const nombre = (a: EmpresaParaElegir, b: EmpresaParaElegir) => a.nombreEmpresa.localeCompare(b.nombreEmpresa, 'es');
  if (orden === 'nombre') return lista.sort(nombre);
  const fecha = (e: EmpresaParaElegir) => (e.ultimaAptitud ? new Date(e.ultimaAptitud).getTime() : -Infinity);
  return lista.sort((a, b) => fecha(b) - fecha(a) || nombre(a, b));
}

/** Solo lo que cambió respecto a lo guardado. */
export function cambiosDeSeleccion(empresas: EmpresaParaElegir[], marcadas: ReadonlySet<string>): CambioSeleccion[] {
  return empresas
    .filter((e) => e.seleccionada !== marcadas.has(e.idEmpresa))
    .map((e) => ({ idEmpresa: e.idEmpresa, seleccionada: marcadas.has(e.idEmpresa) }));
}

/** Valor del filtro de vigencia de la tabla de trabajadores para cada columna. */
export type ColumnaVigencia = 'vigentes' | 'porVencer' | 'vencidasRecientes' | 'vencidasAntiguas' | 'sinAptitud';

export const FILTRO_DE_TABLA: Record<ColumnaVigencia, string> = {
  vigentes: 'Vigente',
  porVencer: 'Por vencer',
  // La tabla no separa las vencidas: muestra los días vencidos de cada una
  vencidasRecientes: 'Vencido',
  vencidasAntiguas: 'Vencido',
  sinAptitud: 'Sin aptitud',
};

/** Columnas de números de la lista, después de «Activos». */
export const COLUMNAS_VIGENCIA: { clave: ColumnaVigencia; titulo: string; color: string }[] = [
  { clave: 'vigentes', titulo: 'Vigentes', color: 'text-emerald-700 dark:text-emerald-400' },
  { clave: 'porVencer', titulo: 'Por vencer', color: 'text-amber-600 dark:text-amber-400' },
  { clave: 'vencidasRecientes', titulo: 'Vencidas', color: 'text-red-600 dark:text-red-400' },
  { clave: 'vencidasAntiguas', titulo: 'Vencidas +6 meses', color: 'text-red-400/80 dark:text-red-300/70' },
  { clave: 'sinAptitud', titulo: 'Sin aptitud', color: 'text-gray-600 dark:text-slate-300' },
];

/**
 * Rejilla compartida por el encabezado y las filas: empresa, activos, las cinco columnas,
 * vencen, al día y acciones. Anchos medidos con Kanit para que cada título quepa en una línea;
 * por debajo de 1280 px cada empresa es una tarjeta.
 */
export const REJILLA_VIGENCIAS =
  'xl:grid xl:grid-cols-[minmax(10rem,1fr)_4rem_4.5rem_5rem_4.5rem_7.5rem_5rem_9.5rem_3.5rem_2rem] xl:items-center xl:gap-x-1';

/** Título de la columna de próximos vencimientos (encabezado y etiqueta en tarjetas). */
export const TITULO_VENCEN = 'Vencen en 30/60/90 días';

const ESTADOS_PENDIENTE: Record<EstadoPendiente, string> = {
  POR_VENCER: 'Por vencer',
  VENCIDA_RECIENTE: 'Vencida',
  VENCIDA_ANTIGUA: 'Vencida hace más de 6 meses',
};

export function textoEstadoPendiente(estado: EstadoPendiente | null): string {
  return estado ? ESTADOS_PENDIENTE[estado] : 'Sin aptitud';
}

export function textoDias(diasRestantes: number | null): string {
  if (diasRestantes === null) return '';
  if (diasRestantes > 0) return `${diasRestantes} ${diasRestantes === 1 ? 'día restante' : 'días restantes'}`;
  const vencidos = -diasRestantes;
  if (vencidos === 0) return 'Vence hoy';
  return `Vencida hace ${vencidos} ${vencidos === 1 ? 'día' : 'días'}`;
}

/** Filas del Excel de pendientes, con los encabezados del archivo. */
export function filasExcelPendientes(filas: PendienteVigencia[]): Record<string, string>[] {
  return filas.map((fila) => ({
    'Centro de trabajo': fila.nombreCentro,
    'Nombre completo': formatNombreCompleto(fila),
    'Num. Trab.': fila.numeroEmpleado && fila.numeroEmpleado !== '-' ? fila.numeroEmpleado : '',
    Puesto: fila.puesto,
    'Última aptitud': fila.fechaUltimaAptitud ? convertirFechaISOaDDMMYYYY(fila.fechaUltimaAptitud) : '',
    'Vence el': fila.fechaVencimiento ? convertirFechaISOaDDMMYYYY(fila.fechaVencimiento) : '',
    Estado: textoEstadoPendiente(fila.estado),
    Días: textoDias(fila.diasRestantes),
  }));
}

export function nombreArchivoPendientes(nombreEmpresa: string, hoy = new Date()): string {
  const limpio = nombreEmpresa.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Empresa';
  const fecha = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0'),
  ].join('-');
  return `Pendientes de aptitud - ${limpio} - ${fecha}.xlsx`;
}
