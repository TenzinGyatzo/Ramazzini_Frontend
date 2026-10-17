/**
 * Mensajes emergentes del sistema (sobre vue-toast-notification), con las mismas llamadas de
 * siempre (`toast.open({ message, type })`, `toast.success(...)`…) y estas reglas en un solo lugar:
 * - Duración según el tipo y el largo del texto (una duración explícita se respeta).
 * - Barra de tiempo que se vacía hasta que el mensaje se cierra; se pausa con el cursor encima,
 *   igual que el temporizador de la librería.
 * - Sin repetidos: si el mismo mensaje ya está en pantalla, no se agrega otro.
 * - El texto siempre se escapa: la librería lo inserta como HTML.
 * Estilos en assets/avisos.css.
 */
import { useToast } from 'vue-toast-notification';
import { escapeHtml } from '@/helpers/escapeHtml';

type TipoAviso = 'success' | 'info' | 'warning' | 'error' | 'default';
type InstanciaLibreria = ReturnType<typeof useToast>;
type OpcionesLibreria = Parameters<InstanciaLibreria['open']>[0];
type OpcionesAviso = Exclude<OpcionesLibreria, string> & { message?: unknown; type?: string };

const DURACION_BASE: Record<TipoAviso, number> = {
  success: 3500,
  info: 5000,
  warning: 6000,
  error: 8000,
  default: 5000,
};
/** Tiempo extra por carácter a partir de un mensaje de 80 caracteres. */
const MS_POR_CARACTER_EXTRA = 40;
const DURACION_MAXIMA = 12000;

const ICONOS: Record<TipoAviso, string> = {
  success: 'fa-circle-check',
  info: 'fa-circle-info',
  warning: 'fa-triangle-exclamation',
  error: 'fa-circle-xmark',
  default: 'fa-circle-info',
};

const tipoValido = (tipo: unknown): TipoAviso =>
  typeof tipo === 'string' && tipo in DURACION_BASE ? (tipo as TipoAviso) : 'success';

export function duracionDeAviso(tipo: unknown, mensaje: string, explicita?: unknown): number {
  if (typeof explicita === 'number' && explicita > 0) return explicita;
  const extra = Math.max(0, mensaje.length - 80) * MS_POR_CARACTER_EXTRA;
  return Math.min(DURACION_BASE[tipoValido(tipo)] + extra, DURACION_MAXIMA);
}

/** Contenido del aviso: ícono, texto escapado, «×» y barra de tiempo. */
export function htmlDeAviso(tipo: unknown, mensaje: string, duracion: number): string {
  const icono = ICONOS[tipoValido(tipo)];
  return (
    `<i class="aviso__icono fa-solid ${icono}" aria-hidden="true"></i>` +
    `<span class="aviso__texto">${escapeHtml(mensaje)}</span>` +
    `<span class="aviso__cerrar" aria-hidden="true">×</span>` +
    `<span class="aviso__barra" style="animation-duration:${Math.round(duracion)}ms" aria-hidden="true"></span>`
  );
}

const textoDe = (mensaje: unknown): string => (mensaje == null ? '' : String(mensaje));

/** Envoltorio con las reglas; misma forma que la instancia de la librería. */
export function crearAvisos(libreria: InstanciaLibreria) {
  const enPantalla = new Set<string>();
  const sinEfecto = { dismiss: () => {} };

  function open(opciones: OpcionesLibreria) {
    const datos: OpcionesAviso = typeof opciones === 'string' ? { message: opciones } : { ...opciones };
    const tipo = tipoValido(datos.type);
    const mensaje = textoDe(datos.message);
    const clave = `${tipo}|${mensaje}`;
    if (enPantalla.has(clave)) return sinEfecto;
    enPantalla.add(clave);

    const duracion = duracionDeAviso(tipo, mensaje, datos.duration);
    const alCerrar = datos.onDismiss;
    return libreria.open({
      ...datos,
      type: tipo,
      duration: duracion,
      message: htmlDeAviso(tipo, mensaje, duracion),
      onDismiss: () => {
        enPantalla.delete(clave);
        alCerrar?.();
      },
    });
  }

  const conTipo = (type: TipoAviso) => (message: string, opciones: Partial<OpcionesAviso> = {}) =>
    open({ ...opciones, message, type });

  return {
    open,
    success: conTipo('success'),
    error: conTipo('error'),
    info: conTipo('info'),
    warning: conTipo('warning'),
    default: conTipo('default'),
    clear: () => {
      enPantalla.clear();
      libreria.clear();
    },
  };
}

export type Avisos = ReturnType<typeof crearAvisos>;

let toastInstance: Avisos | null = null;

/** Instancia global (interceptores y código fuera de componentes). */
export function getToast(): Avisos {
  if (!toastInstance) {
    toastInstance = crearAvisos(useToast({ position: 'top-right' }));
  }
  return toastInstance;
}

/** Inicializa la instancia (main.ts la provee como `toast`). */
export function initToast(): Avisos {
  return getToast();
}
