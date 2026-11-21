import { onMounted, onUnmounted, onUpdated, ref, watch, type Ref } from 'vue';

/**
 * Ancho actual de un elemento (se actualiza al cambiar la ventana o el menú lateral).
 * Sirve para acomodar según el espacio real disponible, que depende también de si el menú
 * lateral está abierto, cosa que los puntos de quiebre de la ventana no saben.
 *
 * El elemento se revisa al montarse, en cada actualización del componente y cuando cambia la
 * referencia: dentro de una transición (`<Transition mode="out-in">` de la vista de crear
 * documento) el aviso del cambio de referencia no siempre llega, y el ancho se quedaba en 0.
 */
export function useAnchoElemento(el: Ref<HTMLElement | null>) {
  const ancho = ref(0);
  let observador: ResizeObserver | null = null;
  let observado: HTMLElement | null = null;

  const desconectar = () => {
    observador?.disconnect();
    observador = null;
    observado = null;
  };

  const sincronizar = () => {
    const nodo = el.value;
    if (nodo === observado) return;
    desconectar();
    if (!nodo) return;
    observado = nodo;
    ancho.value = nodo.getBoundingClientRect().width;
    if (typeof ResizeObserver === 'undefined') return;
    observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja) ancho.value = caja.width;
    });
    observador.observe(nodo);
  };

  watch(el, sincronizar, { flush: 'post' });
  onMounted(sincronizar);
  onUpdated(sincronizar);
  onUnmounted(desconectar);
  return ancho;
}
