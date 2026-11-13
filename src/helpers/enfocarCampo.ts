/**
 * Lleva al usuario al campo que impide guardar: lo encuentra por su marca `data-campo`,
 * lo centra en pantalla, pone el foco en lo primero que se puede capturar, lo resalta y
 * muestra debajo qué hay que corregir. La marca se quita en cuanto el usuario lo cambia.
 *
 * Los pasos del asistente se montan con transición, así que el campo puede tardar en
 * aparecer después de cambiar de paso: se espera un momento antes de rendirse.
 */

export const CLASE_ATENCION = 'campo-atencion';
const ATRIBUTO_MENSAJE = 'data-atencion';
const ESPERA_MAXIMA_MS = 1500;
const INTERVALO_MS = 50;

const ENFOCABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

let limpiarAnterior: (() => void) | null = null;
/** Cada llamada tiene su número; solo la última marca su campo. */
let llamadaActual = 0;

/** Selector del contenedor del campo; varios campos pueden compartir uno (data-campo="a b"). */
export function selectorCampo(campo: string): string {
  return `[data-campo~="${campo.replace(/"/g, '')}"]`;
}

/** Quita el resaltado y el mensaje que haya dejado la última llamada. */
export function limpiarAtencionCampo(): void {
  limpiarAnterior?.();
  limpiarAnterior = null;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** El campo ya se ve completo: no hace falta desplazar ni esperar. */
function estaALaVista(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const alto = window.innerHeight || document.documentElement.clientHeight;
  return r.top >= 0 && r.bottom <= alto;
}

/**
 * Espera a que termine el desplazamiento suave (evento scrollend, en la ventana o en el
 * contenedor que se desplace). Con tope por si el navegador no lo emite.
 */
function finDelDesplazamiento(tope = 600): Promise<void> {
  return new Promise((resolve) => {
    let listo = false;
    const terminar = () => {
      if (listo) return;
      listo = true;
      document.removeEventListener('scrollend', terminar, true);
      clearTimeout(temporizador);
      resolve();
    };
    const temporizador = setTimeout(terminar, tope);
    document.addEventListener('scrollend', terminar, true);
  });
}

async function buscarCampo(
  campo: string,
  raiz: ParentNode,
): Promise<HTMLElement | null> {
  const selector = selectorCampo(campo);
  for (let t = 0; t <= ESPERA_MAXIMA_MS; t += INTERVALO_MS) {
    const el = raiz.querySelector<HTMLElement>(selector);
    // Visible: un paso que va saliendo con transición puede seguir en el DOM
    if (el && el.getClientRects().length > 0) return el;
    await esperar(INTERVALO_MS);
  }
  return null;
}

/**
 * @returns true si encontró y marcó el campo; false si el paso no lo tiene marcado
 *   (el usuario queda en el paso y el aviso sigue diciendo qué falta).
 */
export async function enfocarCampo(
  campo: string | undefined | null,
  mensaje: string,
  raiz: ParentNode = document,
): Promise<boolean> {
  limpiarAtencionCampo();
  const llamada = ++llamadaActual;
  if (!campo || typeof document === 'undefined') return false;

  const el = await buscarCampo(campo, raiz);
  if (!el) return false;

  const foco = el.matches(ENFOCABLE) ? el : el.querySelector<HTMLElement>(ENFOCABLE);
  const yaALaVista = estaALaVista(el);
  if (!yaALaVista) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  foco?.focus({ preventScroll: true });

  // El resaltado se anima cuando la pantalla deja de moverse, para que se vea fluido
  if (!yaALaVista) await finDelDesplazamiento();
  // Mientras tanto se pidió ir a otro campo: este ya no se marca
  if (llamada !== llamadaActual) return false;

  el.classList.add(CLASE_ATENCION);
  el.setAttribute(ATRIBUTO_MENSAJE, mensaje);

  const quitar = () => {
    el.classList.remove(CLASE_ATENCION);
    el.removeAttribute(ATRIBUTO_MENSAJE);
    el.removeEventListener('input', quitar);
    el.removeEventListener('change', quitar);
    if (limpiarAnterior === quitar) limpiarAnterior = null;
  };
  el.addEventListener('input', quitar);
  el.addEventListener('change', quitar);
  limpiarAnterior = quitar;
  return true;
}
