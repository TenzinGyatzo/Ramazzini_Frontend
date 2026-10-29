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

/**
 * Qué más se elimina, en una frase: «Se eliminarán 5 centros de trabajo y 95 trabajadores y
 * sus documentos.» (empresa o centro) o «Se eliminarán 8 documentos.» (trabajador). Omite lo
 * que está en cero; `null` si el registro está vacío.
 */
export function fraseDeLoQueSeElimina(resumen: ResumenEliminacion): string | null {
  const conteos: { n: number; texto: string }[] = [];
  if (resumen.nivel === 'empresa' && resumen.centros > 0) {
    conteos.push({
      n: resumen.centros,
      texto: cantidad(resumen.centros, 'centro de trabajo', 'centros de trabajo'),
    });
  }
  if (resumen.nivel !== 'trabajador' && resumen.trabajadores > 0) {
    conteos.push({
      n: resumen.trabajadores,
      texto: cantidad(resumen.trabajadores, 'trabajador', 'trabajadores'),
    });
  }
  // Los documentos de una empresa o un centro son los de sus trabajadores: no se cuentan aparte
  const susDocumentos = resumen.documentos > 0 && conteos.length > 0;
  if (resumen.documentos > 0 && !susDocumentos) {
    conteos.push({
      n: resumen.documentos,
      texto: cantidad(resumen.documentos, 'documento', 'documentos'),
    });
  }
  if (conteos.length === 0) return null;

  const singular = conteos.length === 1 && conteos[0].n === 1 && !susDocumentos;
  const lista = enLista(conteos.map((c) => c.texto));
  return `Se ${singular ? 'eliminará' : 'eliminarán'} ${lista}${susDocumentos ? ' y sus documentos' : ''}.`;
}

/** Sin resumen del servidor, lo que se sabe que depende de una empresa o un centro. */
export function fraseDependientesSinResumen(entidad: string): string | null {
  if (entidad === 'empresa') return 'Se eliminarán sus centros de trabajo, trabajadores y documentos.';
  if (entidad === 'centroTrabajo') return 'Se eliminarán sus trabajadores y sus documentos.';
  return null;
}

export const NO_SE_PUEDE_DESHACER = 'No se puede deshacer.';

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
