import { onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { esAtajoSubirNivel, vistaPadre } from '@/helpers/navegacionJerarquica';
import { recordarUltimoTrabajador } from '@/helpers/estadoTablaTrabajadores';
import { pedirFocoAlLlegar } from '@/composables/useNavegacionTarjetas';

/** Al escribir, ⌥ + ⌫ borra la palabra anterior en Mac: ahí el atajo no se toma. */
const CAMPO_DE_TEXTO = 'input, textarea, select, [contenteditable="true"]';
const VENTANA_ABIERTA = '[aria-modal="true"], .modal-work-overlay';

/**
 * Alt + ⌫ sube un nivel (helpers/navegacionJerarquica). Se instala una vez en el layout.
 * Al llegar, la tarjeta o la fila de donde se viene recibe el foco. Si la captura de un
 * documento tiene cambios sin guardar, su aviso «¿Descartar cambios?» la protege como siempre.
 */
export function useSubirNivel() {
  const route = useRoute();
  const router = useRouter();

  function alPresionar(evento: KeyboardEvent) {
    if (evento.defaultPrevented || !esAtajoSubirNivel(evento)) return;
    const activo = document.activeElement as HTMLElement | null;
    if (activo?.closest?.(CAMPO_DE_TEXTO)) return;
    if (document.querySelector(VENTANA_ABIERTA)) return;
    const padre = vistaPadre(route);
    if (!padre) return;
    evento.preventDefault();
    if (padre.enfocar) pedirFocoAlLlegar(padre.enfocar);
    if (padre.recordarTrabajador) recordarUltimoTrabajador(...padre.recordarTrabajador);
    router.push(padre.destino);
  }

  onMounted(() => window.addEventListener('keydown', alPresionar));
  onUnmounted(() => window.removeEventListener('keydown', alPresionar));
}
