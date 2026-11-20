/**
 * Índice de la captura rápida (punto 38): el estado de cada sección sale de los mismos
 * problemas que se revisan al guardar (no hay reglas propias que puedan contradecirlas).
 */
import type { ProblemaCampo } from '@/helpers/problemasDocumento';

export type EstadoSeccion = 'completa' | 'pendiente' | 'error' | 'sinEmpezar';

/** Un problema del documento con la sección (1-based) en que está su campo. */
export type ProblemaEnSeccion = ProblemaCampo & { seccion: number | null };

export interface SeccionIndice {
  numero: number;
  nombre: string;
  estado: EstadoSeccion;
  /** Qué falta o qué corregir, corto («Falta talla», «Falta talla y 2 más»). */
  detalle: string;
  /** Al que lleva el clic: el primero de la sección en el orden de la pantalla. */
  problema: ProblemaEnSeccion | null;
}

export interface IndiceCaptura {
  secciones: SeccionIndice[];
  completas: number;
  total: number;
}

/** «Talla» → «talla»; siglas y nombres que empiezan con mayúsculas seguidas se quedan. */
function enMinuscula(nombre: string): string {
  if (nombre.length > 1 && nombre[1] === nombre[1].toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(nombre[1])) {
    return nombre;
  }
  return nombre.charAt(0).toLowerCase() + nombre.slice(1);
}

function detalleFaltantes(faltan: ProblemaEnSeccion[]): string {
  const primero = `Falta ${enMinuscula(faltan[0].nombre)}`;
  return faltan.length > 1 ? `${primero} y ${faltan.length - 1} más` : primero;
}

/**
 * @param nombres nombres de las secciones, en orden
 * @param problemas lista ya ordenada (como al guardar)
 * @param tocadas secciones donde el usuario ya entró a algún campo
 */
export function estadoIndiceCaptura(
  nombres: string[],
  problemas: ProblemaEnSeccion[],
  tocadas: ReadonlySet<number>,
): IndiceCaptura {
  const secciones = nombres.map((nombre, i): SeccionIndice => {
    const numero = i + 1;
    const propios = problemas.filter((p) => p.seccion === numero);
    const errores = propios.filter((p) => !p.falta);
    const faltan = propios.filter((p) => p.falta);
    if (errores.length > 0) {
      return { numero, nombre, estado: 'error', detalle: errores[0].mensaje, problema: propios[0] };
    }
    if (faltan.length > 0) {
      return {
        numero,
        nombre,
        estado: tocadas.has(numero) ? 'pendiente' : 'sinEmpezar',
        detalle: detalleFaltantes(faltan),
        problema: propios[0],
      };
    }
    return { numero, nombre, estado: 'completa', detalle: '', problema: null };
  });
  return {
    secciones,
    completas: secciones.filter((s) => s.estado === 'completa').length,
    total: secciones.length,
  };
}

/**
 * La sección incompleta que sigue (1) o la anterior (-1) a la actual; null si no queda.
 * Sin sección actual, la primera incompleta (o la última, hacia arriba).
 */
export function seccionIncompletaVecina(
  secciones: SeccionIndice[],
  actual: number | null,
  direccion: 1 | -1,
): SeccionIndice | null {
  const incompletas = secciones.filter((s) => s.estado !== 'completa');
  if (direccion === 1) {
    return incompletas.find((s) => actual == null || s.numero > actual) ?? null;
  }
  const previas = incompletas.filter((s) => actual == null || s.numero < actual);
  return previas[previas.length - 1] ?? null;
}

const esMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

const enCampoDeTexto = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(el.type)));

/** Alt + ↓ / ↑: sección incompleta siguiente o anterior; null si la tecla no es el atajo. */
export function atajoDeSeccion(
  e: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target'>,
  mac = esMac(),
): 'siguiente' | 'anterior' | null {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return null;
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return null;
  // Alt + ↓ abre la lista de un select; Option + ↑/↓ en Mac mueve el cursor en el texto
  if (e.target instanceof HTMLSelectElement) return null;
  if (mac && enCampoDeTexto(e.target)) return null;
  if (e.target instanceof Element && e.target.closest('[role="dialog"], [aria-modal="true"]')) return null;
  return e.key === 'ArrowDown' ? 'siguiente' : 'anterior';
}
