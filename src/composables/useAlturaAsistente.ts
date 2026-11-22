import { nextTick, onMounted, onUnmounted, watch, type Ref, type WatchSource } from 'vue';
import { ANCHO_AREA_FIJA, espacioDebajo } from '@/composables/useAlturaHastaElFondo';

/**
 * Con vista previa (punto 45): el asistente y el documento caben en la ventana, para que no haya
 * que desplazar la página. Lo que se desplaza es la caja de contenido del paso (y el documento,
 * que ya tenía su propio desplazamiento); el título, el progreso y los botones Anterior /
 * Siguiente quedan siempre a la vista.
 *
 * Se calcula lo que queda de la ventana debajo del principio del asistente y se pasa como dos
 * variables de CSS en la raíz del documento, que usan las cajas de las secciones y los
 * visualizadores (con su altura máxima de siempre como respaldo):
 * - `--alto-seccion`: la caja de contenido del paso;
 * - `--alto-documento`: el documento, solo si está al lado del asistente (no debajo).
 * Solo en laptop o PC (como el área de la captura rápida); en celular y tableta se desplaza la
 * página, y en la captura rápida no aplica.
 */

/** Además de los rellenos de abajo (espacioDebajo), un poco para la sombra de la tarjeta. */
const MARGEN_INFERIOR = 4;
/** Alto mínimo de la caja de contenido (ventanas muy bajas: se desplaza la página). */
const MINIMO_CAJA = 220;

const CAJA = '[class*="--alto-seccion"]';

function quitar() {
  const raiz = document.documentElement.style;
  raiz.removeProperty('--alto-seccion');
  raiz.removeProperty('--alto-documento');
}

/** Calcula y fija las dos alturas para un asistente (el elemento `[data-form-stepper]`). */
export function ajustarAlturaAsistente(tarjeta: HTMLElement): void {
  const raiz = document.documentElement.style;
  const arriba = tarjeta.getBoundingClientRect().top + window.scrollY;
  // Lo que va debajo hasta el final de la página (rellenos, «Guardar cambios»…), como el área de
  // la captura rápida; de la columna, no de la tarjeta (al lado está el documento)
  const columna = (tarjeta.parentElement as HTMLElement | null) ?? tarjeta;
  const disponible = Math.floor(window.innerHeight - arriba - espacioDebajo(columna) - MARGEN_INFERIOR);

  const caja = tarjeta.querySelector<HTMLElement>(CAJA);
  if (caja) {
    // Lo demás de la tarjeta (modo, progreso, título, botones) no cambia de alto
    const resto = tarjeta.offsetHeight - caja.offsetHeight;
    raiz.setProperty('--alto-seccion', `${Math.max(MINIMO_CAJA, disponible - resto)}px`);
  } else {
    raiz.removeProperty('--alto-seccion');
  }

  // El documento va en la columna de al lado; si quedó debajo (pantalla angosta), sin ajuste
  const documento = tarjeta.parentElement?.nextElementSibling as HTMLElement | null;
  const alLado = !!documento && Math.abs(documento.getBoundingClientRect().top - tarjeta.getBoundingClientRect().top) < 8;
  if (alLado) raiz.setProperty('--alto-documento', `${Math.max(MINIMO_CAJA, disponible)}px`);
  else raiz.removeProperty('--alto-documento');
}

export function useAlturaAsistente(
  tarjeta: Ref<HTMLElement | null>,
  activo: Ref<boolean>,
  cambios: WatchSource[] = [],
) {
  let cuadro = 0;
  const recalcular = () => {
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(() => {
      const el = tarjeta.value;
      if (!el || !activo.value || window.innerWidth < ANCHO_AREA_FIJA) {
        quitar();
        return;
      }
      ajustarAlturaAsistente(el);
    });
  };
  // Lo que cambia la posición o el contenido de la tarjeta: el paso, el modo, el documento
  watch([activo, () => tarjeta.value, ...cambios], () => nextTick(recalcular), { flush: 'post' });
  let observador: ResizeObserver | null = null;
  onMounted(() => {
    window.addEventListener('resize', recalcular);
    if (typeof ResizeObserver !== 'undefined') {
      // Si algo arriba crece o se encoge (avisos, el logo de la empresa al cargar)
      observador = new ResizeObserver(recalcular);
      observador.observe(document.body);
    }
    recalcular();
  });
  onUnmounted(() => {
    window.removeEventListener('resize', recalcular);
    observador?.disconnect();
    cancelAnimationFrame(cuadro);
    quitar();
  });
  return { recalcular };
}
