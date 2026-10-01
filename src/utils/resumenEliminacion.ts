/**
 * Resumen que el servidor da ANTES de pedir la confirmación de una eliminación: qué se
 * va a eliminar y, si no se puede, por qué y dónde está lo que lo impide.
 */
export type NivelResumenEliminacion = 'empresa' | 'centro' | 'trabajador';

export interface UbicacionResguardados {
  trabajadorId: string;
  trabajador: string;
  centroId: string | null;
  centro: string | null;
  documentos: number;
}

export interface ResumenEliminacion {
  nivel: NivelResumenEliminacion;
  nombre: string | null;
  regimen: string;
  centros: number;
  trabajadores: number;
  documentos: number;
  documentosResguardados: number;
  trabajadoresConResguardados: number;
  ubicaciones: UbicacionResguardados[];
  bloqueada: boolean;
  motivo: 'DOCUMENTOS_RESGUARDADOS' | 'CASCADA_DEMASIADO_GRANDE' | null;
  mensaje: string | null;
  maxTrabajadores: number;
}

const miles = (n: number) => n.toLocaleString('es-MX');

const cantidad = (n: number, uno: string, varios: string) =>
  `${miles(n)} ${n === 1 ? uno : varios}`;

const enLista = (partes: string[]) =>
  partes.length > 1
    ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
    : (partes[0] ?? '');

/** «3 centros de trabajo, 120 trabajadores y 950 documentos», o `null` si no cuelga nada. */
export function loQueSeElimina(resumen: ResumenEliminacion): string | null {
  const partes: string[] = [];
  if (resumen.nivel === 'empresa' && resumen.centros > 0) {
    partes.push(cantidad(resumen.centros, 'centro de trabajo', 'centros de trabajo'));
  }
  if (resumen.nivel !== 'trabajador' && resumen.trabajadores > 0) {
    partes.push(cantidad(resumen.trabajadores, 'trabajador', 'trabajadores'));
  }
  if (resumen.documentos > 0) {
    partes.push(cantidad(resumen.documentos, 'documento', 'documentos'));
  }
  return partes.length ? enLista(partes) : null;
}

/** Frase para la ventana de confirmación; `null` si el registro está vacío. */
export function fraseDeLoQueSeElimina(resumen: ResumenEliminacion): string | null {
  const lista = loQueSeElimina(resumen);
  if (!lista) return null;
  return resumen.nivel === 'trabajador'
    ? `También se eliminará todo su expediente: ${lista}.`
    : `También se eliminarán ${lista}.`;
}

/**
 * Aviso cuando la eliminación está permitida pero se lleva documentos finalizados o
 * anulados (proveedores sin régimen SIRES).
 */
export function avisoDocumentosFinalizados(resumen: ResumenEliminacion): string | null {
  if (resumen.bloqueada || resumen.documentosResguardados <= 0) return null;
  const n = resumen.documentosResguardados;
  return n === 1
    ? 'Incluye 1 documento finalizado o anulado, que se eliminará de forma permanente y no podrá recuperarse.'
    : `Incluye ${miles(n)} documentos finalizados o anulados, que se eliminarán de forma permanente y no podrán recuperarse.`;
}

const ARTICULO: Record<NivelResumenEliminacion, string> = {
  empresa: 'la empresa',
  centro: 'el centro de trabajo',
  trabajador: 'el trabajador',
};

export function tituloBloqueo(resumen: ResumenEliminacion): string {
  return `No se puede eliminar ${ARTICULO[resumen.nivel]}`;
}

/** Una línea por trabajador con documentos finalizados: «Juan López · Planta Norte — 3 documentos». */
export function lineasDeUbicaciones(resumen: ResumenEliminacion): string[] {
  if (resumen.motivo !== 'DOCUMENTOS_RESGUARDADOS' || resumen.nivel === 'trabajador') {
    return [];
  }
  return resumen.ubicaciones.map((u) => {
    const donde =
      resumen.nivel === 'empresa' && u.centro
        ? `${u.trabajador || 'Trabajador'} · ${u.centro}`
        : u.trabajador || 'Trabajador';
    return `${donde} — ${cantidad(u.documentos, 'documento', 'documentos')}`;
  });
}

/** «y 12 trabajadores más», cuando la lista no los muestra a todos. */
export function ubicacionesRestantes(resumen: ResumenEliminacion): string | null {
  if (lineasDeUbicaciones(resumen).length === 0) return null;
  const faltan = resumen.trabajadoresConResguardados - resumen.ubicaciones.length;
  return faltan > 0 ? `y ${cantidad(faltan, 'trabajador más', 'trabajadores más')}` : null;
}

/** Qué puede hacer el usuario cuando la eliminación está bloqueada. */
export function sugerenciaBloqueo(resumen: ResumenEliminacion): string | null {
  if (resumen.motivo !== 'DOCUMENTOS_RESGUARDADOS') return null;
  if (resumen.nivel === 'empresa') {
    return 'Puedes eliminar por separado los centros de trabajo y los trabajadores que no tengan documentos finalizados.';
  }
  if (resumen.nivel === 'centro') {
    return 'Puedes eliminar por separado los trabajadores que no tengan documentos finalizados.';
  }
  return 'Puedes darlo de baja para que deje de aparecer como activo; su expediente se conserva.';
}
