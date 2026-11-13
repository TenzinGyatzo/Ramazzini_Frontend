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

/** Un campo que ocupa más de esta parte de la pantalla se muestra desde su principio. */
const PROPORCION_CAMPO_ALTO = 0.6;
/** Si el principio de un campo alto ya está en esta parte de arriba, no se desplaza. */
const PROPORCION_ZONA_SUPERIOR = 0.4;

/**
 * Cómo llevar el campo a la vista:
 * - 'no': ya se ve (completo, o si es alto, su principio en la parte de arriba);
 * - 'centro': campo normal fuera de la vista, se centra;
 * - 'inicio': campo alto (más que buena parte de la pantalla), se muestra desde su
 *   principio para no bajar hasta el fondo; la indicación también está en el aviso.
 */
export function comoDesplazar(
  r: Pick<DOMRect, 'top' | 'bottom' | 'height'>,
  altoPantalla: number,
): 'no' | 'centro' | 'inicio' {
  const esAlto = r.height > altoPantalla * PROPORCION_CAMPO_ALTO;
  if (esAlto) {
    const principioVisible = r.top >= 0 && r.top <= altoPantalla * PROPORCION_ZONA_SUPERIOR;
    return principioVisible ? 'no' : 'inicio';
  }
  return r.top >= 0 && r.bottom <= altoPantalla ? 'no' : 'centro';
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
  const altoPantalla = window.innerHeight || document.documentElement.clientHeight;
  const desplazamiento = comoDesplazar(el.getBoundingClientRect(), altoPantalla);
  const yaALaVista = desplazamiento === 'no';
  if (desplazamiento === 'centro') el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  // El margen superior (scroll-margin de [data-campo]) deja ver el título del campo
  if (desplazamiento === 'inicio') el.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
