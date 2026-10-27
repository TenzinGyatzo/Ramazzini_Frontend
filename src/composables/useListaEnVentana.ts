import { nextTick, onUnmounted, watch, type Ref } from 'vue';
import { useEscapeToClose } from '@/composables/useEscapeToClose';

/** Elementos de la lista: los botones dentro del área marcada con `data-lista-ventana`. */
const SELECTOR_ELEMENTOS = '[data-lista-ventana] button:not([disabled])';

/**
 * Ventana con una lista (las de Inicio): se recorre con el teclado como el resto de la app.
 * - Al abrir, y al terminar de cargar o de cambiar de página, el foco va al primer elemento.
 * - ↑ ↓ recorren la lista; Inicio y Fin van al primero y al último; Enter abre (es un botón).
 * - ← → cambian de página, si la ventana tiene páginas.
 * - Esc cierra, y el foco regresa a donde estaba antes de abrirla (el indicador).
 */
export function useListaEnVentana(
  panel: Ref<HTMLElement | null>,
  opciones: {
    abierta: () => boolean;
    alCerrar: () => void;
    /** Cambia cuando hay elementos nuevos que enfocar (carga, página). */
    contenido?: () => unknown;
    alAnterior?: () => void;
    alSiguiente?: () => void;
  },
) {
  let focoAnterior: HTMLElement | null = null;

  const elementos = (): HTMLElement[] =>
    Array.from(panel.value?.querySelectorAll<HTMLElement>(SELECTOR_ELEMENTOS) ?? []);

  async function enfocarPrimero() {
    await nextTick();
    elementos()[0]?.focus();
  }

  watch(
    () => opciones.abierta(),
    (abierta) => {
      if (abierta) {
        focoAnterior = document.activeElement as HTMLElement | null;
        enfocarPrimero();
        window.addEventListener('keydown', alPresionar);
      } else {
        window.removeEventListener('keydown', alPresionar);
        // De regreso a donde se estaba (el indicador), para seguir con el teclado
        if (focoAnterior?.isConnected) focoAnterior.focus();
        focoAnterior = null;
      }
    },
    { immediate: true },
  );

  watch(
    () => opciones.contenido?.(),
    () => {
      if (opciones.abierta()) enfocarPrimero();
    },
  );

  useEscapeToClose(() => opciones.alCerrar(), () => opciones.abierta());

  function alPresionar(evento: KeyboardEvent) {
    if (evento.defaultPrevented || evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    const lista = elementos();
    const actual = lista.indexOf(document.activeElement as HTMLElement);
    let destino: number | null = null;
    switch (evento.key) {
      case 'ArrowDown':
        destino = actual < 0 ? 0 : Math.min(actual + 1, lista.length - 1);
        break;
      case 'ArrowUp':
        destino = actual < 0 ? lista.length - 1 : Math.max(actual - 1, 0);
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = lista.length - 1;
        break;
      case 'ArrowLeft':
        if (opciones.alAnterior) {
          evento.preventDefault();
          opciones.alAnterior();
        }
        return;
      case 'ArrowRight':
        if (opciones.alSiguiente) {
          evento.preventDefault();
          opciones.alSiguiente();
        }
        return;
      default:
        return;
    }
    evento.preventDefault();
    if (destino !== null && destino >= 0) lista[destino]?.focus();
  }

  onUnmounted(() => window.removeEventListener('keydown', alPresionar));
}
