/**
 * Modo de captura de documentos clínicos (punto 38): «Con vista previa» (el asistente por
 * pasos junto al documento) o «Captura rápida» (todas las secciones en una página).
 *
 * La preferencia es de cada usuario y se recuerda en este navegador. Sin preferencia, se
 * captura como siempre: con vista previa. Los dos modos usan los mismos pasos, el mismo
 * formulario y el mismo guardado; solo cambia cómo se acomodan.
 */
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useDocumentosStore } from '@/stores/documentos';
import { isNotaMedicaSectionsV2Enabled } from '@/composables/useNotaMedicaSectionsV2';
import { isHcSectionsV2Enabled } from '@/composables/useHcSectionsV2';
import { isEfSectionsV2Enabled } from '@/composables/useEfSectionsV2';
import { isEvSectionsV2Enabled } from '@/composables/useEvSectionsV2';
import { isAuSectionsV2Enabled } from '@/composables/useAuSectionsV2';
import { isAptitudSectionsV2Enabled } from '@/composables/useAptitudSectionsV2';

export type ModoCaptura = 'vistaPrevia' | 'capturaRapida';

/** Documentos que ya tienen captura rápida (piloto: la nota médica). */
export const DOCUMENTOS_CAPTURA_RAPIDA = ['notaMedica', 'historiaClinica', 'exploracionFisica', 'examenVista', 'audiometria', 'aptitud', 'notaEnfermeria'] as const;

const PREFIJO_CLAVE = 'ramazzini:modoCaptura:';

export function claveModoCaptura(userId: string | null | undefined): string {
  return PREFIJO_CLAVE + (userId || 'anonimo');
}

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

function almacenDelNavegador(): Almacen | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Preferencia guardada; cualquier valor desconocido (o sin almacén) es «con vista previa». */
export function leerModoCaptura(
  userId: string | null | undefined,
  almacen: Almacen | null = almacenDelNavegador(),
): ModoCaptura {
  try {
    return almacen?.getItem(claveModoCaptura(userId)) === 'capturaRapida'
      ? 'capturaRapida'
      : 'vistaPrevia';
  } catch {
    return 'vistaPrevia';
  }
}

export function guardarModoCaptura(
  userId: string | null | undefined,
  modo: ModoCaptura,
  almacen: Almacen | null = almacenDelNavegador(),
): void {
  try {
    almacen?.setItem(claveModoCaptura(userId), modo);
  } catch {
    // Sin almacén (navegación privada, bloqueado): el modo dura lo que la pestaña
  }
}

export function documentoAdmiteCapturaRapida(
  tipo: string | null | undefined,
  query?: Record<string, unknown>,
): boolean {
  if (!tipo || !(DOCUMENTOS_CAPTURA_RAPIDA as readonly string[]).includes(tipo)) return false;
  // La captura rápida acomoda las secciones; sin ellas (opt-out por query) no aplica
  if (tipo === 'notaMedica') return isNotaMedicaSectionsV2Enabled(query);
  if (tipo === 'historiaClinica') return isHcSectionsV2Enabled(query);
  if (tipo === 'exploracionFisica') return isEfSectionsV2Enabled(query);
  if (tipo === 'examenVista') return isEvSectionsV2Enabled(query);
  if (tipo === 'audiometria') return isAuSectionsV2Enabled(query);
  if (tipo === 'aptitud') return isAptitudSectionsV2Enabled(query);
  return true;
}

/** Estado compartido por la vista y el asistente; se lee de nuevo si cambia el usuario. */
const modoActual = ref<ModoCaptura | null>(null);
let usuarioLeido: string | null | undefined;

export { CAPTURA_RAPIDA_KEY } from '@/composables/capturaRapidaKey';

/** Captura rápida: la vista previa se abre a petición en un panel lateral (la comparten la barra y la vista). */
const vistaPreviaAbierta = ref(false);

export function useModoCaptura() {
  const userStore = useUserStore();
  const documentos = useDocumentosStore();
  const route = useRoute();

  const userId = computed(() => (userStore.user as { _id?: string } | null)?._id ?? null);

  watch(
    userId,
    (id) => {
      if (modoActual.value !== null && usuarioLeido === id) return;
      usuarioLeido = id;
      modoActual.value = leerModoCaptura(id);
    },
    { immediate: true },
  );
  const modo = computed<ModoCaptura>(() => modoActual.value ?? 'vistaPrevia');

  const disponible = computed(() =>
    documentoAdmiteCapturaRapida(
      documentos.currentTypeOfDocument,
      route?.query as Record<string, unknown> | undefined,
    ),
  );

  const capturaRapida = computed(() => disponible.value && modo.value === 'capturaRapida');

  const setModo = (nuevo: ModoCaptura) => {
    usuarioLeido = userId.value;
    modoActual.value = nuevo;
    if (nuevo !== 'capturaRapida') vistaPreviaAbierta.value = false;
    guardarModoCaptura(userId.value, nuevo);
  };

  return { modo, disponible, capturaRapida, setModo, vistaPreviaAbierta };
}
