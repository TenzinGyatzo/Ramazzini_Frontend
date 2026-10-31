import type { Ref } from 'vue';
import { TECLAS_DE_FILA, esTeclaDeBusqueda, filaDestino } from '@/helpers/navegacionFilas';
import { CON_USO_DE_FLECHAS, FLECHAS, VENTANA_ABIERTA } from '@/composables/useNavegacionTarjetas';

const ENLACE_DE_FILA = 'a.nombre-expediente';
const SELECTOR_ENLACE = `tbody ${ENLACE_DE_FILA}`;
const SELECTOR_BUSCADOR = '.dt-search input';
const SELECTOR_ENFOCABLES = 'a[href], button:not(:disabled)';
/** Tiempo tras cerrar una ventana en el que la tabla aún puede redibujarse con los datos guardados. */
const ESPERA_REDIBUJO_MS = 4000;
const INTENTOS_AL_CERRAR = 20;

const claseDeAccion = (elemento: HTMLElement) =>
  Array.from(elemento.classList).find((clase) => clase.startsWith('btn-'));

/**
 * Tabla de trabajadores con el teclado: Tab solo se detiene en una fila y las flechas llevan a las
 * demás; Inicio y Fin van a los extremos de la página, Av Pág y Re Pág cambian de página, y una
 * letra o número sigue en el buscador de la tabla. Enter abre el expediente (el enlace ya lo hace).
 * → y ← recorren las acciones de la fila en el orden en que se ven, ↑ y ↓ pasan a la misma acción de
 * la fila vecina, Esc regresa al nombre y Tab sale de la tabla. Una acción abierta con el teclado devuelve el foco a su fila al cerrar la ventana.
 *
 * Una tabla redibuja sus filas al ordenar, filtrar o paginar: la fila activa se recuerda por su id
 * y `sincronizar` debe llamarse en cada redibujado.
 *
 * Marcado: el contenedor recibe `@keydown="alPresionar"` y `@focusin="alEnfocar"`; la ventana,
 * `keydown` con `alPresionarEnPagina`, para que la primera flecha llegue a la tabla.
 */
export function useNavegacionFilas(
  contenedor: Ref<HTMLElement | null>,
  /** Avanza o retrocede una página; devuelve si había a dónde ir. */
  cambiarPagina: (paso: 1 | -1) => boolean,
) {
  let filaActiva: string | undefined;
  let accionConTeclado = false;
  let temporizador: number | undefined;

  const enlaces = (): HTMLElement[] =>
    Array.from(contenedor.value?.querySelectorAll<HTMLElement>(SELECTOR_ENLACE) ?? []);
  const buscador = () => contenedor.value?.querySelector<HTMLInputElement>(SELECTOR_BUSCADOR) ?? null;

  const ventanaAbierta = () => Boolean(document.querySelector(VENTANA_ABIERTA));
  const focoSuelto = () => !document.activeElement || document.activeElement === document.body;

  function enfocarFilaActiva() {
    if (!focoSuelto()) return;
    enlaces().find((enlace) => enlace.dataset.id === filaActiva)?.focus();
  }

  /** Expediente y acciones de la fila, de izquierda a derecha como se ven. */
  function accionesDeFila(enlace: HTMLElement): HTMLElement[] {
    const elementos = enlace.closest('tr')?.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES) ?? [];
    return Array.from(elementos)
      .filter((elemento) => elemento !== enlace)
      .map((elemento) => ({ elemento, izquierda: elemento.getBoundingClientRect().left }))
      .sort((a, b) => a.izquierda - b.izquierda)
      .map(({ elemento }) => elemento);
  }

  /** El recorrido de Tab solo se detiene en el nombre de la fila activa. */
  function sincronizar() {
    const lista = enlaces();
    const activo = lista.find((enlace) => enlace.dataset.id === filaActiva) ?? lista[0];
    filaActiva = activo?.dataset.id;
    for (const enlace of lista) {
      if (enlace === activo) enlace.removeAttribute('tabindex');
      else enlace.tabIndex = -1;
      for (const accion of accionesDeFila(enlace)) accion.tabIndex = -1;
    }
    if (accionConTeclado && !ventanaAbierta()) enfocarFilaActiva();
  }

  /** Al cerrar una ventana; las ventanas tardan un momento en salir de la pantalla. */
  function devolverFoco() {
    if (!accionConTeclado) return;
    let intentos = 0;
    const intentar = () => {
      if (ventanaAbierta() && intentos++ < INTENTOS_AL_CERRAR) {
        window.setTimeout(intentar, 50);
        return;
      }
      enfocarFilaActiva();
    };
    intentar();
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => {
      accionConTeclado = false;
    }, ESPERA_REDIBUJO_MS);
  }

  function alEnfocar(evento: FocusEvent) {
    const fila = (evento.target as HTMLElement | null)?.closest?.('tbody tr');
    const id = fila?.querySelector<HTMLElement>(ENLACE_DE_FILA)?.dataset.id;
    if (!id || id === filaActiva) return;
    filaActiva = id;
    sincronizar();
  }

  function enfocarBuscador(texto?: string) {
    const campo = buscador();
    if (!campo) return;
    campo.focus();
    if (texto === undefined) {
      campo.select();
      return;
    }
    campo.value = texto;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** La misma acción en la fila vecina; si esa fila no la tiene, la que ocupa su lugar. */
  function moverAFilaVecina(accion: HTMLElement, enlace: HTMLElement, paso: 1 | -1) {
    const lista = enlaces();
    const vecino = lista[lista.indexOf(enlace) + paso];
    if (!vecino) return;
    const acciones = accionesDeFila(vecino);
    const misma = acciones.find((candidata) => claseDeAccion(candidata) === claseDeAccion(accion));
    const lugar = Math.min(accionesDeFila(enlace).indexOf(accion), acciones.length - 1);
    (misma ?? acciones[lugar])?.focus();
  }

  function alPresionarEnAccion(evento: KeyboardEvent, accion: HTMLElement, enlace: HTMLElement) {
    if (evento.key === 'Enter' || evento.key === ' ') {
      accionConTeclado = true;
      return;
    }
    if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    if (evento.key === 'Escape') {
      enlace.focus();
      return;
    }
    if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown') {
      evento.preventDefault();
      moverAFilaVecina(accion, enlace, evento.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
    evento.preventDefault();
    const acciones = accionesDeFila(enlace);
    const indice = acciones.indexOf(accion);
    if (evento.key === 'ArrowRight') acciones[Math.min(indice + 1, acciones.length - 1)].focus();
    else (acciones[indice - 1] ?? enlace).focus();
  }

  function alPresionar(evento: KeyboardEvent) {
    if (ventanaAbierta()) return;
    const objetivo = evento.target as HTMLElement | null;

    if (objetivo?.matches?.(SELECTOR_BUSCADOR)) {
      if (evento.key !== 'ArrowDown' || evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
      const primera = enlaces()[0];
      if (!primera) return;
      evento.preventDefault();
      primera.focus();
      return;
    }

    const enlaceDeLaFila = objetivo?.closest?.('tbody tr')?.querySelector<HTMLElement>(ENLACE_DE_FILA);
    if (!objetivo || !enlaceDeLaFila) return;
    if (objetivo !== enlaceDeLaFila) {
      if (objetivo.matches(SELECTOR_ENFOCABLES)) alPresionarEnAccion(evento, objetivo, enlaceDeLaFila);
      return;
    }

    if (esTeclaDeBusqueda(evento)) {
      evento.preventDefault();
      enfocarBuscador(evento.key);
      return;
    }
    if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;

    if (evento.key === 'PageDown' || evento.key === 'PageUp') {
      evento.preventDefault();
      if (cambiarPagina(evento.key === 'PageDown' ? 1 : -1)) enlaces()[0]?.focus();
      return;
    }
    if (evento.key === 'ArrowRight') {
      const [primera] = accionesDeFila(objetivo);
      if (primera) {
        evento.preventDefault();
        primera.focus();
      }
      return;
    }
    if (!TECLAS_DE_FILA.has(evento.key)) return;

    evento.preventDefault();
    const lista = enlaces();
    const destino = filaDestino(evento.key, lista.indexOf(objetivo), lista.length);
    if (destino < 0) enfocarBuscador();
    else lista[destino].focus();
  }

  /** La primera flecha, si nada la está usando, lleva al nombre de la fila activa. */
  function alPresionarEnPagina(evento: KeyboardEvent) {
    if (evento.defaultPrevented || !FLECHAS.has(evento.key)) return;
    if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    const activo = document.activeElement as HTMLElement | null;
    if (activo?.closest?.(CON_USO_DE_FLECHAS) || activo?.closest?.('tbody') || ventanaAbierta()) return;
    const enlace = enlaces().find((candidato) => candidato.dataset.id === filaActiva);
    if (!enlace) return;
    evento.preventDefault();
    enlace.focus();
  }

  return { alPresionar, alPresionarEnPagina, alEnfocar, sincronizar, devolverFoco };
}
