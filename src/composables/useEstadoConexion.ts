/**
 * Estado de la conexión para avisar al guardar:
 * - `enLinea` sigue los eventos online/offline del navegador (orientativo: en Windows el
 *   navegador puede creer que hay red aunque no haya internet) y `restablecida` queda en true
 *   unos segundos cuando la conexión regresa.
 * - `useVerificacionServidor` comprueba de verdad, cada pocos segundos, si el servidor ya
 *   responde, para avisar que se puede reintentar.
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

/**
 * Error que impide guardar por la conexión o por el servidor (no por los datos): sin respuesta,
 * puerta de enlace caída (502/503/504) o un 500 sin explicación (p. ej. el servidor no alcanza su
 * base de datos). Un 500 con un mensaje propio se muestra tal cual.
 */
export function esFalloDeConexionOServidor(error: unknown): boolean {
  if (esErrorSinRespuesta(error)) return true;
  const respuesta = (error as { response?: { status?: number; data?: { message?: unknown } } } | null)?.response;
  const estado = respuesta?.status ?? 0;
  if ([502, 503, 504].includes(estado)) return true;
  if (estado !== 500) return false;
  const mensaje = respuesta?.data?.message;
  return !mensaje || (typeof mensaje === 'string' && /^internal server error$/i.test(mensaje.trim()));
}

const INTERVALO_VERIFICACION_MS = 5000;

/**
 * Tras un fallo al guardar, consulta al servidor cada 5 s hasta que responda bien.
 * `disponible`: null mientras no se verifica, false mientras falla, true cuando ya responde.
 */
export function useVerificacionServidor(consultar: () => Promise<unknown>) {
  const disponible = ref<boolean | null>(null);
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let activa = false;

  const detener = () => {
    activa = false;
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
  };

  const verificar = async () => {
    if (!activa) return;
    try {
      await consultar();
      if (!activa) return;
      disponible.value = true;
      detener();
    } catch {
      if (!activa) return;
      disponible.value = false;
      temporizador = setTimeout(verificar, INTERVALO_VERIFICACION_MS);
    }
  };

  const iniciar = () => {
    detener();
    activa = true;
    disponible.value = false;
    temporizador = setTimeout(verificar, INTERVALO_VERIFICACION_MS);
  };

  const reiniciar = () => {
    detener();
    disponible.value = null;
  };

  onUnmounted(detener);
  return { disponible, iniciar, reiniciar };
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
