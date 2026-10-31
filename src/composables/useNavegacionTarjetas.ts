import { nextTick, onMounted, onUnmounted, type Ref } from 'vue';
import {
  TECLAS_NAVEGACION,
  esTeclaDeSalto,
  indicePorTexto,
  vecinoEnRejilla,
} from '@/helpers/navegacionTarjetas';

/** Atributo del enlace principal de cada tarjeta; su valor es el id del registro. */
const SELECTOR_ENLACE = '[data-tarjeta-nav]';
const DURACION_RESALTADO_MS = 2600;
const INTENTOS_RESALTADO = 10;
/** Fracción del alto de la ventana que debe quedar libre arriba y abajo de la tarjeta destino. */
const MARGEN_VISIBLE = 0.12;
export const FLECHAS: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
/** Donde las flechas ya tienen un uso propio: ahí no se toman para las tarjetas. */
export const CON_USO_DE_FLECHAS =
  'input, textarea, select, [contenteditable="true"], [role="menu"], [role="listbox"], [role="tablist"], [role="radiogroup"], [role="slider"]';
/** Letras escritas con menos de esta pausa se juntan («con» busca ese inicio). */
const PAUSA_ENTRE_LETRAS_MS = 700;
/** Ventana abierta: las flechas son suyas. */
export const VENTANA_ABIERTA = '[aria-modal="true"], .modal-work-overlay';

/** Tarjeta que debe recibir el foco cuando la vista que la muestra termine de cargar. */
let focoPendiente: string | null = null;
const INTENTOS_FOCO_AL_LLEGAR = 60;

/** Al subir un nivel (useSubirNivel): la tarjeta de donde se viene recibe el foco al llegar. */
export function pedirFocoAlLlegar(id: string) {
  focoPendiente = id || null;
}

const sinMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Tarjetas en rejilla que se recorren con el teclado: flechas entre tarjetas, Inicio y Fin,
 * Enter abre (el enlace ya lo hace). La tarjeta recién creada se lleva a la vista, recibe el
 * foco y se tiñe de verde un momento.
 *
 * Al llegar a la vista, la primera flecha (sin un campo ni una ventana con el foco) lleva a la
 * primera tarjeta, para no tener que buscarla con el mouse o con Tab. Una letra salta a la
 * tarjeta cuyo nombre empieza con ella (repetirla avanza entre las que empiezan igual); el nombre
 * se toma de `data-tarjeta-nombre` en el enlace.
 *
 * Marcado: el contenedor recibe `@keydown="alPresionar"`; cada tarjeta lleva la clase
 * `tarjeta-nav` y su enlace principal `data-tarjeta-nav="<id>"` y la clase `tarjeta-nav__enlace`.
 */
export function useNavegacionTarjetas(
  contenedor: Ref<HTMLElement | null>,
  opciones: {
    alSalirArriba?: () => void;
    /** Enter cuando nada tiene el foco (Inicio: ir a Empresas). */
    alEnterSinSeleccion?: () => void;
    /** Salto por letra; en Inicio no aplica (sus elementos no son una lista de nombres). */
    saltoPorLetra?: boolean;
  } = {},
) {
  const conSaltoPorLetra = opciones.saltoPorLetra !== false;
  const enlaces = (): HTMLElement[] =>
    Array.from(contenedor.value?.querySelectorAll<HTMLElement>(SELECTOR_ENLACE) ?? []);

  /**
   * Si la tarjeta ya se ve con holgura, la página no se mueve (recorrer con flechas no la hace
   * saltar en cada tecla); si está fuera o pegada a un borde, queda a media altura de la ventana.
   */
  function enfocar(enlace: HTMLElement, centrar = false) {
    enlace.focus({ preventScroll: true });
    const tarjeta = enlace.closest<HTMLElement>('.tarjeta-nav') ?? enlace;
    const { top, bottom } = tarjeta.getBoundingClientRect();
    const holgura = window.innerHeight * MARGEN_VISIBLE;
    const comoda = top >= holgura && bottom <= window.innerHeight - holgura;
    if (comoda && !centrar) return;
    tarjeta.scrollIntoView?.({ block: 'center', behavior: sinMovimiento() ? 'auto' : 'smooth' });
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
        const { top, left, width, height } = enlace.getBoundingClientRect();
        return { top, left, width, height };
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

  let escrito = '';
  let ultimaLetra = 0;

  /** Salta a la tarjeta cuyo nombre empieza con lo escrito; si no hay, no se mueve. */
  function saltarPorLetra(evento: KeyboardEvent, activo: HTMLElement | null) {
    const ahora = Date.now();
    escrito = ahora - ultimaLetra > PAUSA_ENTRE_LETRAS_MS ? evento.key : escrito + evento.key;
    ultimaLetra = ahora;
    const lista = enlaces();
    const actual = activo ? lista.indexOf(activo.closest(SELECTOR_ENLACE) as HTMLElement) : -1;
    const destino = indicePorTexto(
      lista.map((enlace) => enlace.dataset.tarjetaNombre ?? enlace.textContent ?? ''),
      actual,
      escrito,
    );
    if (destino === null) return;
    evento.preventDefault();
    if (destino !== actual) enfocar(lista[destino]);
  }

  /**
   * Teclado en la página: una letra salta por nombre; la primera flecha, si nada la está usando,
   * empieza en la primera tarjeta (dentro de la rejilla las flechas las atiende `alPresionar`);
   * Esc suelta la selección y, sin selección, Enter hace la acción de la vista si la hay.
   */
  function alPresionarEnPagina(evento: KeyboardEvent) {
    if (evento.defaultPrevented) return;
    if (evento.altKey || evento.ctrlKey || evento.metaKey) return;
    const activo = document.activeElement as HTMLElement | null;
    if (activo?.closest?.(CON_USO_DE_FLECHAS)) return;
    if (document.querySelector(VENTANA_ABIERTA)) return;
    const dentro = !!activo && !!contenedor.value?.contains(activo);
    if (evento.key === 'Escape' && dentro) {
      evento.preventDefault();
      activo!.blur();
      return;
    }
    if (evento.key === 'Enter' && opciones.alEnterSinSeleccion && !evento.shiftKey) {
      const sinSeleccion = !activo || activo === document.body || activo === document.documentElement;
      if (sinSeleccion) {
        evento.preventDefault();
        opciones.alEnterSinSeleccion();
      }
      return;
    }
    if (conSaltoPorLetra && esTeclaDeSalto(evento.key)) {
      saltarPorLetra(evento, activo);
      return;
    }
    if (!FLECHAS.has(evento.key) || evento.shiftKey) return;
    if (dentro) return;
    if (enfocarPrimera()) evento.preventDefault();
  }

  /** La lista llega del servidor: se espera a que la tarjeta pedida exista (hasta 3 s). */
  async function atenderFocoPendiente() {
    const id = focoPendiente;
    focoPendiente = null;
    if (!id) return;
    for (let intento = 0; intento < INTENTOS_FOCO_AL_LLEGAR; intento++) {
      const enlace = enlaces().find((e) => e.dataset.tarjetaNav === id);
      if (enlace) {
        enfocar(enlace);
        return;
      }
      await new Promise((resolver) => window.setTimeout(resolver, 50));
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', alPresionarEnPagina);
    atenderFocoPendiente();
  });
  onUnmounted(() => window.removeEventListener('keydown', alPresionarEnPagina));

  return { alPresionar, enfocarPrimera, resaltar };
}
