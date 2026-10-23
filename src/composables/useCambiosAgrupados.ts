import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';

/** Tiempo desde el último clic antes de mandar los cambios juntos. */
export const ESPERA_CAMBIOS_AGRUPADOS_MS = 1000;

export interface CambioAgrupado {
  id: string;
  valor: boolean;
}

/**
 * Junta los clics de una lista de casillas en una sola petición: cada clic se ve al instante y,
 * un segundo después del último, se mandan todos juntos (una sola entrada en la bitácora).
 * Una casilla que regresa a su valor original antes del envío no se manda.
 * Al salir de la vista, lo pendiente se manda en ese momento.
 */
export function useCambiosAgrupados(
  enviar: (cambios: CambioAgrupado[]) => Promise<void>,
  espera = ESPERA_CAMBIOS_AGRUPADOS_MS,
) {
  /** Por id: valor guardado en el servidor y valor elegido. */
  const pendientes = new Map<string, { original: boolean; valor: boolean }>();
  const hayPendientes = ref(false);
  const enviando = ref(false);
  let temporizador: ReturnType<typeof setTimeout> | null = null;

  function programar() {
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      temporizador = null;
      void enviarYa();
    }, espera);
  }

  /** Registra un clic: `original` es el valor que tenía antes de este clic. */
  function cambiar(id: string, valor: boolean, original: boolean) {
    const previo = pendientes.get(id);
    const guardado = previo ? previo.original : original;
    if (valor === guardado) pendientes.delete(id);
    else pendientes.set(id, { original: guardado, valor });
    hayPendientes.value = pendientes.size > 0;
    if (pendientes.size) programar();
    else if (temporizador) {
      clearTimeout(temporizador);
      temporizador = null;
    }
  }

  /** Manda lo pendiente; si hay un envío en curso, espera a que termine y vuelve a programar. */
  async function enviarYa() {
    if (temporizador) {
      clearTimeout(temporizador);
      temporizador = null;
    }
    if (!pendientes.size) return;
    if (enviando.value) {
      programar();
      return;
    }
    const cambios = [...pendientes].map(([id, { valor }]) => ({ id, valor }));
    pendientes.clear();
    hayPendientes.value = false;
    enviando.value = true;
    try {
      await enviar(cambios);
    } finally {
      enviando.value = false;
    }
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      void enviarYa();
    });
  }

  return { cambiar, enviarYa, hayPendientes, enviando };
}
