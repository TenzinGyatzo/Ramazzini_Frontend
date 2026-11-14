import { onMounted, onUnmounted, nextTick } from 'vue';
import { hayAtencionEnCurso, selectorCampo } from '@/helpers/enfocarCampo';

/**
 * Al abrir un paso, pone el cursor en el primer dato obligatorio que siga vacío (marcas
 * `data-campo`, en el orden de la pantalla) y ahorra el clic. Para que ayude sin estorbar:
 * - solo en laptop o PC (en celular o tableta abriría el teclado y movería la vista);
 * - si el aviso al guardar está llevando a un dato, gana el aviso;
 * - si el usuario ya hizo clic o tecleó desde que se abrió el paso, no se toca nada;
 * - solo campos donde se escribe (ni botones ni campos desactivados) y sin mover la pantalla.
 * Con `siempreElPrimero`, va al primero aunque tenga valor y lo selecciona (audiometría: se
 * reemplaza el 0 y se avanza con Tab).
 */

const ESCRIBIBLE =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])';

/**
 * Laptop o PC de escritorio. Las tabletas y celulares quedan fuera aunque tengan teclado o
 * mouse conectado: un iPad con trackpad dice «puntero fino», y iPadOS se presenta como Mac,
 * así que además se revisa el navegador y la pantalla táctil.
 */
export function esComputadora(): boolean {
  if (typeof window === 'undefined') return true;
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const ua = nav?.userAgent ?? '';
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(ua)) return false;
  // iPadOS 13+ se presenta como Macintosh, pero tiene pantalla táctil
  if (/Macintosh/i.test(ua) && (nav?.maxTouchPoints ?? 0) > 1) return false;
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function campoEscribible(campo: string): HTMLInputElement | HTMLTextAreaElement | null {
  const contenedor = document.querySelector<HTMLElement>(selectorCampo(campo));
  if (!contenedor || contenedor.getClientRects().length === 0) return null;
  return contenedor.matches(ESCRIBIBLE)
    ? (contenedor as HTMLInputElement)
    : contenedor.querySelector<HTMLInputElement | HTMLTextAreaElement>(ESCRIBIBLE);
}

/** El primer campo de la lista que se puede escribir y está vacío (o el primero, si siempre). */
export function primerCampoParaEnfocar(
  campos: string[],
  siempreElPrimero = false,
): HTMLInputElement | HTMLTextAreaElement | null {
  for (const campo of campos) {
    const el = campoEscribible(campo);
    if (!el) continue;
    if (siempreElPrimero || el.value.trim() === '') return el;
  }
  return null;
}

const esperarCuadro = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    } else setTimeout(resolve, 0);
  });

export function useAutofocoPrimerVacio(
  campos: string[] | (() => string[]),
  opciones: { siempreElPrimero?: boolean } = {},
) {
  let interactuo = false;
  let desmontado = false;
  const marcar = () => {
    interactuo = true;
  };

  onMounted(async () => {
    if (!esComputadora()) return;
    document.addEventListener('pointerdown', marcar, true);
    document.addEventListener('keydown', marcar, true);
    // Espera a que el paso termine de pintarse (y a que la vista por secciones ponga su cursor)
    await nextTick();
    await esperarCuadro();
    if (desmontado || interactuo || hayAtencionEnCurso()) return;
    const lista = typeof campos === 'function' ? campos() : campos;
    const el = primerCampoParaEnfocar(lista, opciones.siempreElPrimero);
    if (!el || document.activeElement === el) return;
    el.focus({ preventScroll: true });
    if (opciones.siempreElPrimero) el.select();
  });

  onUnmounted(() => {
    desmontado = true;
    document.removeEventListener('pointerdown', marcar, true);
    document.removeEventListener('keydown', marcar, true);
  });
}
