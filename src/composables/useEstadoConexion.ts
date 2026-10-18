/**
 * Estado de la conexión del navegador para avisar antes de guardar: `enLinea` sigue los eventos
 * online/offline y `restablecida` queda en true unos segundos cuando la conexión regresa.
 */
import { onMounted, onUnmounted, ref } from 'vue';

const AVISO_RESTABLECIDA_MS = 5000;

/** Error de una petición que no tuvo respuesta del servidor (sin internet, caído o tiempo agotado). */
export function esErrorSinRespuesta(error: unknown): boolean {
  const e = error as { isAxiosError?: boolean; response?: unknown; request?: unknown; code?: string } | null;
  if (!e || e.response) return false;
  if (e.isAxiosError || e.request) return true;
  return ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(e.code ?? '');
}

export function useEstadoConexion() {
  const enLinea = ref(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  const restablecida = ref(false);
  let temporizador: ReturnType<typeof setTimeout> | null = null;

  const alConectar = () => {
    enLinea.value = true;
    restablecida.value = true;
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      restablecida.value = false;
      temporizador = null;
    }, AVISO_RESTABLECIDA_MS);
  };
  const alDesconectar = () => {
    enLinea.value = false;
    restablecida.value = false;
  };

  onMounted(() => {
    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
  });
  onUnmounted(() => {
    window.removeEventListener('online', alConectar);
    window.removeEventListener('offline', alDesconectar);
    if (temporizador) clearTimeout(temporizador);
  });

  return { enLinea, restablecida };
}
