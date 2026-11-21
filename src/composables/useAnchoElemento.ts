import { onUnmounted, ref, watch, type Ref } from 'vue';

/**
 * Ancho actual de un elemento (se actualiza al cambiar la ventana o el menú lateral).
 * Sirve para acomodar según el espacio real disponible, que depende también de si el menú
 * lateral está abierto, cosa que los puntos de quiebre de la ventana no saben.
 */
export function useAnchoElemento(el: Ref<HTMLElement | null>) {
  const ancho = ref(0);
  let observador: ResizeObserver | null = null;

  const desconectar = () => {
    observador?.disconnect();
    observador = null;
  };

  watch(
    el,
    (nodo) => {
      desconectar();
      if (!nodo) return;
      ancho.value = nodo.getBoundingClientRect().width;
      if (typeof ResizeObserver === 'undefined') return;
      observador = new ResizeObserver((entradas) => {
        const caja = entradas[0]?.contentRect;
        if (caja) ancho.value = caja.width;
      });
      observador.observe(nodo);
    },
    { immediate: true, flush: 'post' },
  );

  onUnmounted(desconectar);
  return ancho;
}
