import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

/**
 * Captura rápida (punto 38): el área de captura ocupa lo que queda de la ventana debajo de
 * su principio, para que se desplace solo ella (y el índice se quede quieto) sin que la
 * página tenga scroll propio. Solo en pantallas anchas (laptop o PC): en celular y tableta se
 * desplaza la página completa, como cualquier formulario (un área fija dejaba muy poco espacio).
 */

/** Desde este ancho (lg de Tailwind) el área de captura tiene alto fijo. */
export const ANCHO_AREA_FIJA = 1024;

const num = (v: string) => parseFloat(v) || 0;

/** Lo que va debajo del elemento hasta el final de la página (rellenos y lo que sigue abajo). */
export function espacioDebajo(el: HTMLElement): number {
  let total = 0;
  let nodo: HTMLElement = el;
  while (nodo.parentElement && nodo !== document.body) {
    total += num(getComputedStyle(nodo).marginBottom);
    const fondo = nodo.getBoundingClientRect().bottom;
    for (let s = nodo.nextElementSibling; s; s = s.nextElementSibling) {
      const cs = getComputedStyle(s);
      if (cs.position === 'fixed' || cs.position === 'absolute' || cs.display === 'none') continue;
      const r = s.getBoundingClientRect();
      // Solo lo que queda abajo (no lo que está al lado en una fila)
      if (r.height > 0 && r.top >= fondo - 1) total += r.height + num(cs.marginTop) + num(cs.marginBottom);
    }
    const padre: HTMLElement = nodo.parentElement;
    if (padre === document.body || padre === document.documentElement) break;
    const pcs = getComputedStyle(padre);
    total += num(pcs.paddingBottom) + num(pcs.borderBottomWidth);
    nodo = padre;
  }
  return total;
}

export function alturaHastaElFondo(el: HTMLElement, alturaVentana: number, minimo: number): number {
  const principio = el.getBoundingClientRect().top + window.scrollY;
  return Math.max(minimo, Math.floor(alturaVentana - principio - espacioDebajo(el)));
}

export function useAlturaHastaElFondo(
  el: Ref<HTMLElement | null>,
  activo: Ref<boolean>,
  minimo = 320,
) {
  const altura = ref<number | null>(null);
  let cuadro = 0;

  const medir = () => {
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(() => {
      if (!activo.value || !el.value || window.innerWidth < ANCHO_AREA_FIJA) {
        altura.value = null;
        return;
      }
      const nueva = alturaHastaElFondo(el.value, window.innerHeight, minimo);
      if (altura.value == null || Math.abs(nueva - altura.value) > 1) altura.value = nueva;
    });
  };

  // Lo de arriba (logo, barra, datos del trabajador) puede cambiar de alto al cargar
  let observador: ResizeObserver | null = null;
  onMounted(() => {
    window.addEventListener('resize', medir);
    if (typeof ResizeObserver !== 'undefined') {
      observador = new ResizeObserver(medir);
      observador.observe(document.body);
    }
    medir();
  });
  onUnmounted(() => {
    window.removeEventListener('resize', medir);
    observador?.disconnect();
    cancelAnimationFrame(cuadro);
  });
  watch([activo, el], medir);

  return { altura, medir };
}
