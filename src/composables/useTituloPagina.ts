import { nextTick, onBeforeUnmount, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { formarTitulo } from '@/helpers/tituloPagina';

/**
 * La vista pone un título propio en la pestaña (p. ej. «J.P.G. · Expediente»). El router pone
 * el de la sección en cada navegación; aquí se vuelve a aplicar después, para que también valga
 * cuando la misma vista cambia de trabajador o de centro. Al salir de la vista deja de aplicarse,
 * para no tapar el título de la siguiente.
 */
export function useTituloPagina(partes: () => Array<string | null | undefined | false>) {
  let activa = true;
  const aplicar = () => {
    if (activa) document.title = formarTitulo(partes());
  };
  // Después de dibujar: si la navegación sale de esta vista, ya no se ejecuta
  watchEffect(aplicar, { flush: 'post' });
  const quitar = useRouter().afterEach(() => {
    void nextTick(aplicar);
  });
  onBeforeUnmount(() => {
    activa = false;
    quitar();
  });
}
