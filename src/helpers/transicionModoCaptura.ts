/**
 * Transición visual al cambiar entre «Con vista previa» y «Captura rápida» (View Transitions
 * del navegador). El asistente se transforma en el área de captura y el documento se guarda en
 * el botón «Vista previa» (y al revés): los elementos llevan el mismo `view-transition-name` en
 * los dos modos (ver NOMBRES_TRANSICION) y el navegador anima posición y tamaño.
 *
 * Solo es visual: si el navegador no la tiene, el usuario pidió reducir el movimiento o la
 * pestaña no está a la vista, el cambio es instantáneo, como antes.
 */
import { nextTick } from 'vue';

export const NOMBRES_TRANSICION = {
  /** La tarjeta del asistente (con vista previa) ↔ el área de captura rápida. */
  asistente: 'captura-asistente',
  /** El documento (con vista previa) ↔ el botón «Vista previa» de la barra. */
  documento: 'captura-documento',
} as const;

type DocumentoConTransicion = Document & {
  startViewTransition?: (actualizar: () => Promise<void> | void) => { updateCallbackDone: Promise<void> };
};

function reducirMovimiento(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Dos cuadros (para que se midan alturas y anchos), con tope por si no hay cuadros. */
function esperarAcomodo(): Promise<void> {
  return new Promise((resolve) => {
    const tope = setTimeout(resolve, 120);
    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        clearTimeout(tope);
        resolve();
      }),
    );
  });
}

export function transicionDisponible(doc: DocumentoConTransicion = document): boolean {
  return typeof doc.startViewTransition === 'function' && !reducirMovimiento() && doc.visibilityState !== 'hidden';
}

/**
 * Aplica el cambio de modo dentro de una transición de vista. Se resuelve cuando la pantalla
 * nueva ya está lista (Vue la dibujó y se acomodó), aunque la animación siga corriendo.
 */
export async function conTransicionDeModo(
  actualizar: () => void,
  doc: DocumentoConTransicion = document,
  hacia: 'capturaRapida' | 'vistaPrevia' = 'capturaRapida',
): Promise<void> {
  if (!transicionDisponible(doc)) {
    actualizar();
    await nextTick();
    return;
  }
  // La dirección decide qué imagen se escala (el documento) y cuál no (el botón)
  const raiz = doc.documentElement;
  const clase = 'transicion-hacia-vista-previa';
  raiz?.classList.toggle(clase, hacia === 'vistaPrevia');
  const transicion = doc.startViewTransition!(async () => {
    actualizar();
    await nextTick();
    await esperarAcomodo();
  }) as { updateCallbackDone: Promise<void>; finished?: Promise<void> };
  transicion.finished?.finally(() => raiz?.classList.remove(clase)).catch(() => {});
  try {
    await transicion.updateCallbackDone;
  } catch {
    // Si la transición se interrumpe, el cambio de modo ya se aplicó
  }
}
