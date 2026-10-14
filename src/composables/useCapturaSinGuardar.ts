import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { stableStringify } from '@/composables/useDirtySnapshot';

/**
 * Aviso al salir de la captura de un documento clínico con cambios sin guardar.
 *
 * Al abrir un documento, el sistema rellena solo varios campos (datos cargados del servidor,
 * valores por omisión que escriben los pasos al mostrarse, ruta del PDF…). Por eso la referencia
 * no se toma al montar: se va actualizando hasta la primera interacción real del usuario dentro
 * de la zona de captura y ahí se fija. Hay cambios si lo actual difiere de esa referencia.
 */

/** Zona de captura: contenido de los pasos y botones de acción rápida (no la navegación). */
export const ZONA_CAPTURA = '[data-captura-documento]';

// Tras guardar, el formulario navega al expediente: esa salida no debe preguntar.
const salidaTrasGuardar = ref(false);

export function permitirSalidaTrasGuardar() {
  salidaTrasGuardar.value = true;
}

export function crearVigilanteDeCaptura(getEstado: () => unknown) {
  const huella = () => stableStringify(getEstado());
  let referencia: string | null = null;

  return {
    /** Primera interacción del usuario: fija la referencia (antes de que se aplique el cambio). */
    registrarInteraccion() {
      if (referencia === null) referencia = huella();
    },
    hayCambios() {
      return referencia !== null && huella() !== referencia;
    },
    reiniciar() {
      referencia = null;
    },
  };
}

interface Opciones {
  getEstado: () => unknown;
  /** Falso en documentos de solo lectura. */
  habilitado: () => boolean;
}

export function useCapturaSinGuardar({ getEstado, habilitado }: Opciones) {
  salidaTrasGuardar.value = false;
  const vigilante = crearVigilanteDeCaptura(getEstado);

  // `hayCambios` depende del estado (reactivo) y de la referencia (no reactiva): se fuerza con un contador
  const versionReferencia = ref(0);
  const hayCambios = computed(() => {
    void versionReferencia.value;
    void stableStringify(getEstado());
    return habilitado() && !salidaTrasGuardar.value && vigilante.hayCambios();
  });

  const alInteractuar = (evento: Event) => {
    if (!evento.isTrusted) return;
    const objetivo = evento.target as Element | null;
    if (!objetivo?.closest?.(ZONA_CAPTURA)) return;
    vigilante.registrarInteraccion();
    versionReferencia.value++;
  };

  const alCerrarLaPestana = (evento: BeforeUnloadEvent) => {
    if (!hayCambios.value) return;
    evento.preventDefault();
    evento.returnValue = '';
  };

  // Fase de captura: se registra antes de que v-model o los botones apliquen el cambio
  const EVENTOS = ['input', 'change', 'click'] as const;
  onMounted(() => {
    EVENTOS.forEach((tipo) => document.addEventListener(tipo, alInteractuar, true));
    window.addEventListener('beforeunload', alCerrarLaPestana);
  });
  onUnmounted(() => {
    EVENTOS.forEach((tipo) => document.removeEventListener(tipo, alInteractuar, true));
    window.removeEventListener('beforeunload', alCerrarLaPestana);
  });

  const preguntaDeDescarte = shallowRef<{ responder: (descartar: boolean) => void } | null>(null);
  const mostrarConfirmacion = computed(() => preguntaDeDescarte.value !== null);

  function confirmarSalida(): Promise<boolean> {
    if (!hayCambios.value) return Promise.resolve(true);
    preguntaDeDescarte.value?.responder(false);
    return new Promise((resolve) => {
      preguntaDeDescarte.value = { responder: resolve };
    });
  }

  function responderDescarte(descartar: boolean) {
    const pregunta = preguntaDeDescarte.value;
    preguntaDeDescarte.value = null;
    pregunta?.responder(descartar);
  }

  onBeforeRouteLeave(() => confirmarSalida());
  // Mismo componente, otro documento (cambia tipo o id en la ruta)
  onBeforeRouteUpdate((to, from) => {
    const mismoDocumento =
      to.params.tipoDocumento === from.params.tipoDocumento &&
      to.params.idDocumento === from.params.idDocumento;
    return mismoDocumento ? true : confirmarSalida();
  });

  function reiniciar() {
    salidaTrasGuardar.value = false;
    vigilante.reiniciar();
    versionReferencia.value++;
  }

  return { hayCambios, mostrarConfirmacion, responderDescarte, reiniciar };
}
