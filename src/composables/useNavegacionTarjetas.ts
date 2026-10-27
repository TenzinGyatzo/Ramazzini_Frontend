import { nextTick, onMounted, onUnmounted, type Ref } from 'vue';
import { TECLAS_NAVEGACION, vecinoEnRejilla } from '@/helpers/navegacionTarjetas';

/** Atributo del enlace principal de cada tarjeta; su valor es el id del registro. */
const SELECTOR_ENLACE = '[data-tarjeta-nav]';
const DURACION_RESALTADO_MS = 2600;
const INTENTOS_RESALTADO = 10;
const FLECHAS: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
/** Donde las flechas ya tienen un uso propio: ahí no se toman para las tarjetas. */
const CON_USO_DE_FLECHAS =
  'input, textarea, select, [contenteditable="true"], [role="menu"], [role="listbox"], [role="tablist"], [role="radiogroup"], [role="slider"]';
/** Ventana abierta: las flechas son suyas. */
const VENTANA_ABIERTA = '[aria-modal="true"], .modal-work-overlay';

const sinMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Tarjetas en rejilla que se recorren con el teclado: flechas entre tarjetas, Inicio y Fin,
 * Enter abre (el enlace ya lo hace). La tarjeta recién creada se lleva a la vista, recibe el
 * foco y se tiñe de verde un momento.
 *
 * Al llegar a la vista, la primera flecha (sin un campo ni una ventana con el foco) lleva a la
 * primera tarjeta, para no tener que buscarla con el mouse o con Tab.
 *
 * Marcado: el contenedor recibe `@keydown="alPresionar"`; cada tarjeta lleva la clase
 * `tarjeta-nav` y su enlace principal `data-tarjeta-nav="<id>"` y la clase `tarjeta-nav__enlace`.
 */
export function useNavegacionTarjetas(
  contenedor: Ref<HTMLElement | null>,
  opciones: { alSalirArriba?: () => void } = {},
) {
  const enlaces = (): HTMLElement[] =>
    Array.from(contenedor.value?.querySelectorAll<HTMLElement>(SELECTOR_ENLACE) ?? []);

  function enfocar(enlace: HTMLElement, centrar = false) {
    enlace.focus({ preventScroll: true });
    enlace.scrollIntoView?.({
      block: centrar ? 'center' : 'nearest',
      behavior: sinMovimiento() ? 'auto' : 'smooth',
    });
  }

  function alPresionar(evento: KeyboardEvent) {
    if (!TECLAS_NAVEGACION.has(evento.key)) return;
    if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    // Solo desde el enlace principal: en los botones de la tarjeta las flechas no hacen nada
    const actual = (evento.target as HTMLElement | null)?.closest?.(SELECTOR_ENLACE) as HTMLElement | null;
    if (!actual || actual !== evento.target) return;
    const lista = enlaces();
    const indice = lista.indexOf(actual);
    const destino = vecinoEnRejilla(
      lista.map((enlace) => {
        const { top, left } = enlace.getBoundingClientRect();
        return { top, left };
      }),
      indice,
      evento.key,
    );
    if (destino === null) {
      if (evento.key === 'ArrowUp' && opciones.alSalirArriba) {
        evento.preventDefault();
        opciones.alSalirArriba();
      }
      return;
    }
    evento.preventDefault();
    if (destino !== indice) enfocar(lista[destino]);
  }

  /** Del buscador a la primera tarjeta (flecha abajo). Devuelve si había alguna. */
  function enfocarPrimera(): boolean {
    const primera = enlaces()[0];
    if (!primera) return false;
    enfocar(primera);
    return true;
  }

  /** Lleva a la vista la tarjeta del registro, le da el foco y la tiñe un momento. */
  async function resaltar(id: string): Promise<boolean> {
    await nextTick();
    // La tarjeta puede tardar unos cuadros en pintarse (transiciones de la lista)
    let enlace = enlaces().find((e) => e.dataset.tarjetaNav === id);
    for (let intento = 0; !enlace && intento < INTENTOS_RESALTADO; intento++) {
      await new Promise((resolver) => window.setTimeout(resolver, 50));
      enlace = enlaces().find((e) => e.dataset.tarjetaNav === id);
    }
    if (!enlace) return false;
    enfocar(enlace, true);
    const tarjeta = enlace.closest<HTMLElement>('.tarjeta-nav');
    if (tarjeta) {
      tarjeta.classList.remove('tarjeta-nav--reciente');
      void tarjeta.offsetWidth; // reinicia la animación si se repite
      tarjeta.classList.add('tarjeta-nav--reciente');
      window.setTimeout(() => tarjeta.classList.remove('tarjeta-nav--reciente'), DURACION_RESALTADO_MS);
    }
    return true;
  }

  /** Primera flecha en la página: si nada la está usando, empieza en la primera tarjeta. */
  function alPresionarEnPagina(evento: KeyboardEvent) {
    if (evento.defaultPrevented || !FLECHAS.has(evento.key)) return;
    if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    const activo = document.activeElement as HTMLElement | null;
    if (activo?.closest?.(CON_USO_DE_FLECHAS)) return;
    if (activo && contenedor.value?.contains(activo)) return;
    if (document.querySelector(VENTANA_ABIERTA)) return;
    if (enfocarPrimera()) evento.preventDefault();
  }

  onMounted(() => window.addEventListener('keydown', alPresionarEnPagina));
  onUnmounted(() => window.removeEventListener('keydown', alPresionarEnPagina));

  return { alPresionar, enfocarPrimera, resaltar };
}
