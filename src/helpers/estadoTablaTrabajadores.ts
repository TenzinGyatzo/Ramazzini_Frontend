/**
 * Estado de la tabla de trabajadores que se recuerda al volver (del expediente, con «Atrás»
 * o tras editar): búsqueda general, página, orden y filas por página, por centro de trabajo.
 *
 * Se guarda en sessionStorage (solo esa pestaña, se borra al cerrarla) para no dejar en el
 * equipo los nombres buscados. No se guardan los filtros por columna ni la visibilidad de
 * columnas: esos los maneja el panel de filtros (localStorage) y los botones de columnas.
 */

const PREFIJO_ESTADO = 'ramazzini:tabla-trabajadores:';
const PREFIJO_ULTIMO = 'ramazzini:tabla-trabajadores:ultimo:';
const PREFIJO_NUEVO = 'ramazzini:tabla-trabajadores:nuevo:';

export interface EstadoTabla {
  time: number;
  start: number;
  length: number;
  order: unknown[];
  search: { search: string; smart?: boolean; regex?: boolean; caseInsensitive?: boolean };
}

type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function almacenDeSesion(): Almacen | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

export function claveEstadoTabla(centroId: string | null | undefined): string | null {
  return centroId ? `${PREFIJO_ESTADO}${centroId}` : null;
}

/** Solo las partes que se recuerdan; descarta columnas y cualquier otro dato del estado. */
export function estadoParaGuardar(estado: Record<string, any> | null | undefined): EstadoTabla | null {
  if (!estado || typeof estado !== 'object') return null;
  const search = estado.search && typeof estado.search === 'object' ? estado.search : {};
  return {
    time: Number(estado.time) || Date.now(),
    start: Math.max(0, Number(estado.start) || 0),
    length: Number(estado.length) || 10,
    order: Array.isArray(estado.order) ? estado.order : [],
    search: {
      search: typeof search.search === 'string' ? search.search : '',
      smart: search.smart,
      regex: search.regex,
      caseInsensitive: search.caseInsensitive,
    },
  };
}

export function guardarEstadoTabla(
  centroId: string | null | undefined,
  estado: Record<string, any> | null | undefined,
  almacen: Almacen | null = almacenDeSesion(),
): void {
  const clave = claveEstadoTabla(centroId);
  const datos = estadoParaGuardar(estado);
  if (!clave || !datos || !almacen) return;
  try {
    almacen.setItem(clave, JSON.stringify(datos));
  } catch {
    // Almacenamiento lleno o bloqueado: la tabla funciona igual, solo no recuerda
  }
}

export function leerEstadoTabla(
  centroId: string | null | undefined,
  almacen: Almacen | null = almacenDeSesion(),
): EstadoTabla | null {
  const clave = claveEstadoTabla(centroId);
  if (!clave || !almacen) return null;
  try {
    const crudo = almacen.getItem(clave);
    return crudo ? estadoParaGuardar(JSON.parse(crudo)) : null;
  } catch {
    return null;
  }
}

/** Trabajador con el que se trabajó al último (expediente, edición, baja…), para resaltarlo. */
export function recordarUltimoTrabajador(
  centroId: string | null | undefined,
  trabajadorId: string | null | undefined,
  almacen: Almacen | null = almacenDeSesion(),
): void {
  if (!centroId || !trabajadorId || !almacen) return;
  try {
    almacen.setItem(`${PREFIJO_ULTIMO}${centroId}`, String(trabajadorId));
  } catch {
    // ignorar
  }
}

/** Devuelve el último trabajador y lo olvida (el resaltado ocurre una sola vez). */
export function tomarUltimoTrabajador(
  centroId: string | null | undefined,
  almacen: Almacen | null = almacenDeSesion(),
): string | null {
  return tomar(`${PREFIJO_ULTIMO}${centroId}`, centroId, almacen);
}

/**
 * Trabajador recién registrado: además de resaltarlo, la tabla lo pone a la vista aunque la
 * búsqueda o la página que se recuerdan lo dejaran fuera.
 */
export function recordarTrabajadorNuevo(
  centroId: string | null | undefined,
  trabajadorId: string | null | undefined,
  almacen: Almacen | null = almacenDeSesion(),
): void {
  if (!centroId || !trabajadorId || !almacen) return;
  try {
    almacen.setItem(`${PREFIJO_NUEVO}${centroId}`, String(trabajadorId));
  } catch {
    // ignorar
  }
}

/** Devuelve el trabajador recién registrado y lo olvida. */
export function tomarTrabajadorNuevo(
  centroId: string | null | undefined,
  almacen: Almacen | null = almacenDeSesion(),
): string | null {
  return tomar(`${PREFIJO_NUEVO}${centroId}`, centroId, almacen);
}

function tomar(clave: string, centroId: string | null | undefined, almacen: Almacen | null): string | null {
  if (!centroId || !almacen) return null;
  try {
    const id = almacen.getItem(clave);
    almacen.removeItem(clave);
    return id || null;
  } catch {
    return null;
  }
}
