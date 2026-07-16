<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const proveedorSaludStore = useProveedorSaludStore();
const { proveedorSalud } = storeToRefs(proveedorSaludStore);
const router = useRouter();
const route = useRoute();

const emit = defineEmits(['closeModal']);

const panelRef = ref(null);
const closeButtonRef = ref(null);
let previousActiveElement = null;

const closeModal = () => {
  emit('closeModal');
};

useEscapeToClose(closeModal);

const historiasDelMes = ref(0);
const vistaActual = ref(route.name);

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const trapFocus = (event) => {
  if (event.key !== 'Tab' || !panelRef.value) return;

  const focusable = [
    ...panelRef.value.querySelectorAll(FOCUSABLE_SELECTOR),
  ].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const focusCloseButton = async () => {
  await nextTick();
  closeButtonRef.value?.focus();
};

onMounted(async () => {
  previousActiveElement = document.activeElement;
  document.addEventListener('keydown', trapFocus);
  historiasDelMes.value = await proveedorSaludStore.getHistoriasClinicasDelMes();
});

onUnmounted(() => {
  document.removeEventListener('keydown', trapFocus);
  if (previousActiveElement instanceof HTMLElement) {
    previousActiveElement.focus();
  }
});

const maxHistoriasPermitidasAlMes = computed(
  () => proveedorSalud.value?.maxHistoriasPermitidasAlMes
);
const periodoDePruebaFinalizado = computed(
  () => proveedorSalud.value?.periodoDePruebaFinalizado
);
const estadoSuscripcion = computed(() => proveedorSalud.value?.estadoSuscripcion);
const finDeSuscripcion = computed(() =>
  proveedorSalud.value?.finDeSuscripcion
    ? new Date(proveedorSalud.value.finDeSuscripcion)
    : null
);

const goToSubscription = () => router.push({ name: 'subscription' });

const modalContent = computed(() => {
  if (periodoDePruebaFinalizado.value && !estadoSuscripcion.value) {
    return {
      variant: 'trial',
      title: 'Tu prueba gratuita ha finalizado',
      message:
        'Tu periodo de prueba terminó. Para seguir usando Ramazzini, elige un plan.',
      highlight: 'A partir de $999/mes',
      highlightDetail:
        'Accede a todas las herramientas para gestionar tu práctica de salud ocupacional.',
      benefits: [
        'Registra y gestiona a tus clientes y sus trabajadores',
        'Genera informes y documentos personalizados de forma automática',
        'Mejora la precisión y confianza en tu trabajo',
      ],
      buttonText: 'Suscríbete ahora',
      action: goToSubscription,
      secondaryText: 'Seguir explorando',
      showDisclaimer: true,
      icon: 'fa-hourglass-end',
      show: true,
    };
  }

  if (
    periodoDePruebaFinalizado.value &&
    estadoSuscripcion.value === 'cancelled' &&
    (!finDeSuscripcion.value || finDeSuscripcion.value <= new Date())
  ) {
    return {
      variant: 'expired',
      title: 'Tu suscripción ha finalizado',
      message: finDeSuscripcion.value
        ? `Tu acceso expiró el ${finDeSuscripcion.value.toLocaleDateString()}.`
        : 'Tu acceso expiró anteriormente.',
      highlight: null,
      highlightDetail:
        'Reactiva tu acceso para volver a usar todas las herramientas. Hay planes que se adaptan a tus necesidades.',
      benefits: null,
      buttonText: 'Suscríbete ahora',
      action: goToSubscription,
      secondaryText: 'Seguir explorando',
      showDisclaimer: true,
      icon: 'fa-calendar-times',
      show: true,
    };
  }

  if (periodoDePruebaFinalizado.value && estadoSuscripcion.value === 'inactive') {
    return {
      variant: 'inactive',
      title: 'Tu pago no fue procesado',
      message:
        'Hubo un problema con tu pago y la suscripción no pudo activarse.',
      highlight: null,
      highlightDetail:
        'Actualiza tu método de pago para seguir usando las herramientas sin interrupciones.',
      benefits: null,
      buttonText: 'Actualizar pago',
      action: goToSubscription,
      secondaryText: 'Seguir explorando',
      showDisclaimer: true,
      icon: 'fa-credit-card',
      show: true,
    };
  }

  if (
    vistaActual.value === 'expediente-medico' &&
    maxHistoriasPermitidasAlMes.value != null &&
    historiasDelMes.value >= maxHistoriasPermitidasAlMes.value
  ) {
    return {
      variant: 'limit',
      title: 'Has alcanzado el límite de historias clínicas este mes',
      message: `Tu plan actual permite hasta ${maxHistoriasPermitidasAlMes.value} historias clínicas al mes.`,
      highlight: `${maxHistoriasPermitidasAlMes.value} / ${maxHistoriasPermitidasAlMes.value}`,
      highlightDetail:
        'Actualiza tu plan para continuar registrando exámenes médicos laborales este mes.',
      benefits: [
        'Registra y gestiona más exámenes médicos laborales al mes',
        'Realiza un seguimiento detallado de la salud ocupacional',
        'Mejora la atención y el control médico de los trabajadores',
      ],
      buttonText: 'Actualizar plan',
      action: goToSubscription,
      secondaryText: 'Seguir explorando',
      showDisclaimer: false,
      icon: 'fa-file-medical',
      show: true,
    };
  }

  return { show: false };
});

watch(
  () => modalContent.value.show,
  (show) => {
    if (show !== false) {
      focusCloseButton();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    v-if="modalContent.show !== false"
    class="modal fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
  >
    <div
      class="absolute inset-0 bg-emerald-900/50 backdrop-blur-sm"
      aria-hidden="true"
      @click="closeModal"
    />

    <Transition appear name="modal-sub">
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-suscripcion-title"
        tabindex="-1"
        class="modal-inner relative z-10 flex w-full max-w-md max-h-[90vh] flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white text-gray-900 shadow-lg outline-none"
      >
        <button
          ref="closeButtonRef"
          type="button"
          class="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-2xl leading-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:bg-gray-200"
          aria-label="Cerrar"
          @click="closeModal"
        >
          &times;
        </button>

        <div class="flex flex-col gap-5 p-5 pt-6 sm:p-6 sm:pt-7">
          <!-- Encabezado -->
          <div class="flex items-start gap-3 pr-8">
            <div
              class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50"
              aria-hidden="true"
            >
              <i
                :class="['fas', modalContent.icon, 'text-lg text-emerald-600']"
              />
            </div>
            <h2
              id="modal-suscripcion-title"
              class="pt-1.5 text-xl font-semibold leading-snug tracking-tight text-gray-900"
            >
              {{ modalContent.title }}
            </h2>
          </div>

          <!-- Cuerpo -->
          <div class="flex flex-col gap-4">
            <p class="text-sm leading-relaxed text-gray-600 sm:text-base">
              {{ modalContent.message }}
            </p>

            <div
              v-if="modalContent.highlight || modalContent.highlightDetail"
              class="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3"
            >
              <p
                v-if="modalContent.highlight"
                class="text-base font-semibold text-emerald-800"
              >
                {{ modalContent.highlight }}
              </p>
              <p
                v-if="modalContent.highlightDetail"
                class="text-sm leading-relaxed text-gray-600"
                :class="{ 'mt-1': modalContent.highlight }"
              >
                {{ modalContent.highlightDetail }}
              </p>
            </div>

            <ul
              v-if="modalContent.benefits?.length"
              class="flex flex-col gap-2.5"
            >
              <li
                v-for="(benefit, index) in modalContent.benefits"
                :key="index"
                class="flex items-start gap-2.5 text-sm leading-snug text-gray-700"
              >
                <i
                  class="fas fa-check mt-0.5 flex-shrink-0 text-xs text-emerald-600"
                  aria-hidden="true"
                />
                <span>{{ benefit }}</span>
              </li>
            </ul>
          </div>

          <!-- Acciones -->
          <div class="flex flex-col items-stretch gap-3 pt-1">
            <button
              type="button"
              class="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm shadow-emerald-200 transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
              @click="modalContent.action"
            >
              {{ modalContent.buttonText }}
            </button>

            <button
              type="button"
              class="mx-auto px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md"
              @click="closeModal"
            >
              {{ modalContent.secondaryText }}
            </button>

            <p
              v-if="modalContent.showDisclaimer"
              class="text-center text-xs text-gray-400"
            >
              Cancela en cualquier momento. Sin compromisos.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.modal-sub-enter-from,
.modal-sub-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.modal-sub-enter-active,
.modal-sub-leave-active {
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .modal-sub-enter-from,
  .modal-sub-leave-to {
    transform: none;
  }

  .modal-sub-enter-active,
  .modal-sub-leave-active {
    transition: opacity 1ms linear;
  }
}
</style>
