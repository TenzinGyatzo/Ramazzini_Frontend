import { computed, onMounted, onUnmounted, shallowRef, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

/**
 * Pantalla con cambios sin guardar: al salir pregunta con el diálogo «¿Descartar cambios?»
 * (ModalDiscardConfirmDialog) y al cerrar o recargar la pestaña avisa el navegador.
 * La vista monta el diálogo con `mostrarConfirmacion` y `responderDescarte`.
 */
export function useSalidaConCambios(hayCambios: Ref<boolean>) {
  const pregunta = shallowRef<{ responder: (descartar: boolean) => void } | null>(null);
  const mostrarConfirmacion = computed(() => pregunta.value !== null);

  function confirmarSalida(): Promise<boolean> {
    if (!hayCambios.value) return Promise.resolve(true);
    pregunta.value?.responder(false);
    return new Promise((resolve) => {
      pregunta.value = { responder: resolve };
    });
  }

  function responderDescarte(descartar: boolean) {
    const actual = pregunta.value;
    pregunta.value = null;
    actual?.responder(descartar);
  }

  const alCerrarLaPestana = (evento: BeforeUnloadEvent) => {
    if (!hayCambios.value) return;
    evento.preventDefault();
    evento.returnValue = '';
  };

  onBeforeRouteLeave(() => confirmarSalida());
  onMounted(() => window.addEventListener('beforeunload', alCerrarLaPestana));
  onUnmounted(() => window.removeEventListener('beforeunload', alCerrarLaPestana));

  return { mostrarConfirmacion, responderDescarte, confirmarSalida };
}
