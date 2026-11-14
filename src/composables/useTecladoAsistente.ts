import { onMounted, onUnmounted } from 'vue';

/**
 * Teclado en el asistente de documentos (FormStepper), para quien captura con Tab:
 * - Los campos de una línea de solo lectura (IMC, categorías, medidas base) no reciben el
 *   cursor: Tab los salta y el clic no se queda en ellos (siguen mostrando su explicación al
 *   pasar el mouse). Los cuadros de texto largos de solo lectura no cambian (se pueden copiar).
 * - Alt + ← / Alt + → cambian de paso (como «Anterior» / «Siguiente»). En Mac, Option + ←/→
 *   mueve el cursor por palabras dentro de un texto: ahí no se intercepta.
 */

const CAPTURA = '[data-captura-documento]';
const SOLO_LECTURA = 'input[readonly]';

/** Tab salta los campos de solo lectura del área de captura. */
export function quitarDelTabLosSoloLectura(raiz: ParentNode = document): void {
  raiz.querySelectorAll<HTMLInputElement>(`${CAPTURA} ${SOLO_LECTURA}`).forEach((el) => {
    if (el.getAttribute('tabindex') !== '-1') el.setAttribute('tabindex', '-1');
  });
}

/** Un clic en un campo de solo lectura del área de captura no le pone el cursor. */
export function evitarFocoAlHacerClic(e: MouseEvent): void {
  const objetivo = e.target;
  if (objetivo instanceof HTMLInputElement && objetivo.readOnly && objetivo.closest(CAPTURA)) {
    e.preventDefault();
  }
}

const esMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

const enCampoDeTexto = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(el.type)));

/** Qué paso pide la tecla, o null si no es un atajo del asistente (o no aplica aquí). */
export function atajoDePaso(
  e: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target'>,
  mac = esMac(),
): 'anterior' | 'siguiente' | null {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return null;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return null;
  // Option + flecha en Mac mueve el cursor por palabras: no se le quita al texto
  if (mac && enCampoDeTexto(e.target)) return null;
  // Con una ventana abierta (lista de pendientes, avisos) no se cambia de paso detrás de ella
  if (e.target instanceof Element && e.target.closest('[role="dialog"], [aria-modal="true"]')) return null;
  return e.key === 'ArrowLeft' ? 'anterior' : 'siguiente';
}

export function useTecladoAsistente(acciones: {
  anterior: () => void;
  siguiente: () => void;
  puedeAnterior: () => boolean;
  puedeSiguiente: () => boolean;
}) {
  let observador: MutationObserver | null = null;

  const alTeclear = (e: KeyboardEvent) => {
    const atajo = atajoDePaso(e);
    if (!atajo) return;
    // Siempre se evita el «atrás» del navegador (Alt + ← en Windows) dentro del asistente
    e.preventDefault();
    const puede = atajo === 'anterior' ? acciones.puedeAnterior() : acciones.puedeSiguiente();
    if (!puede) return;
    // El campo termina su captura (p. ej. la audiometría redondea al salir del campo)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (atajo === 'anterior') acciones.anterior();
    else acciones.siguiente();
  };

  onMounted(() => {
    quitarDelTabLosSoloLectura();
    document.addEventListener('mousedown', evitarFocoAlHacerClic, true);
    window.addEventListener('keydown', alTeclear);
    // Los pasos se montan y desmontan: se revisa cada vez que cambia el contenido
    observador = new MutationObserver(() => quitarDelTabLosSoloLectura());
    observador.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['readonly'] });
  });

  onUnmounted(() => {
    document.removeEventListener('mousedown', evitarFocoAlHacerClic, true);
    window.removeEventListener('keydown', alTeclear);
    observador?.disconnect();
  });
}
