<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import {
  CORREO_RAMAZZINI,
  abrirWhatsApp,
  enlaceCorreo,
} from '@/utils/contactoRamazzini';
import { nombrePlanContrato } from '@/utils/accesoComercial';

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

// Límite efectivo: el manual del Administrador de plataforma prevalece sobre el del plan
const maxHistoriasPermitidasAlMes = computed(
  () => proveedorSaludStore.limiteHistoriasEfectivo
);
const finDeSuscripcion = computed(() =>
  proveedorSalud.value?.finDeSuscripcion
    ? new Date(proveedorSalud.value.finDeSuscripcion)
    : null
);

const goToSubscription = () => router.push({ name: 'subscription' });

const modalBase = computed(() => {
  // Misma regla que los bloqueos de expediente, documentos y trabajadores
  const bloqueo = proveedorSaludStore.bloqueoComercial;

  // Restricción comercial fijada por el Administrador de plataforma
  if (bloqueo === 'restringido') {
    return {
      variant: 'restricted',
      title: 'Tu cuenta tiene el acceso restringido',
      message:
        'Puedes consultar tu espacio de trabajo, pero por ahora no es posible registrar trabajadores ni crear documentos.',
      highlight: null,
      highlightDetail:
        'Si crees que se trata de un error, contacta a Ramazzini. También puedes revisar los planes disponibles.',
      benefits: null,
      buttonText: 'Ver planes',
      action: goToSubscription,
      secondaryText: 'Seguir explorando',
      showDisclaimer: false,
      icon: 'fa-lock',
      show: true,
    };
  }

  // Contrato con Ramazzini (transferencia o enlace de Mercado Pago) vencido o terminado
  if (bloqueo === 'contrato_vencido') {
    const contrato = proveedorSaludStore.contrato;
    const hasta = contrato?.pagadoHasta ? new Date(contrato.pagadoHasta) : null;
    return {
      variant: 'contract',
      title: 'Tu plan con Ramazzini no está vigente',
      message: hasta
        ? `Tu ${nombrePlanContrato(contrato)} estuvo vigente hasta el ${hasta.toLocaleDateString()}.`
        : `Tu ${nombrePlanContrato(contrato)} no tiene una vigencia registrada.`,
      highlight: null,
      highlightDetail:
        'Contacta a Ramazzini para renovarlo y volver a registrar trabajadores y crear documentos.',
      benefits: null,
      buttonText: 'Contactar a Ramazzini por WhatsApp',
      action: () => abrirWhatsApp(proveedorSalud.value?.nombre),
      secondaryText: 'Seguir explorando',
      showDisclaimer: false,
      contactoCorreo: enlaceCorreo(proveedorSalud.value?.nombre),
      icon: 'fa-file-contract',
      show: true,
    };
  }

  if (bloqueo === 'prueba_vencida') {
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

  if (bloqueo === 'suscripcion_vencida') {
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

  if (bloqueo === 'pago_inactivo') {
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

/** Sin pago en línea: el plan se gestiona con Ramazzini (WhatsApp / correo) en vez de «Ver planes». */
const TEXTOS_SIN_PAGO_EN_LINEA = {
  restricted: {
    highlightDetail: 'Si crees que se trata de un error, contacta a Ramazzini.',
    buttonText: 'Contactar a Ramazzini por WhatsApp',
  },
  trial: {
    message: 'Tu periodo de prueba terminó. Para seguir usando Ramazzini, contáctanos y te ayudamos a elegir tu plan.',
    highlight: null,
    buttonText: 'Contactar a Ramazzini por WhatsApp',
  },
  expired: {
    highlightDetail: 'Contacta a Ramazzini para reactivar tu acceso y volver a usar todas las herramientas.',
    buttonText: 'Contactar a Ramazzini por WhatsApp',
  },
  inactive: {
    highlightDetail: 'Contacta a Ramazzini para regularizar tu pago y seguir usando las herramientas sin interrupciones.',
    buttonText: 'Contactar a Ramazzini por WhatsApp',
  },
  limit: {
    highlightDetail: 'Contacta a Ramazzini para ampliar tu plan y continuar registrando exámenes médicos laborales este mes.',
    buttonText: 'Contactar a Ramazzini por WhatsApp',
  },
};

const pagoEnLineaHabilitado = computed(() => proveedorSaludStore.pagoEnLineaHabilitado);

const modalContent = computed(() => {
  const base = modalBase.value;
  if (base.show === false || pagoEnLineaHabilitado.value) return base;
  return {
    ...base,
    ...(TEXTOS_SIN_PAGO_EN_LINEA[base.variant] ?? {}),
    action: () => abrirWhatsApp(proveedorSalud.value?.nombre),
    showDisclaimer: false,
    contactoCorreo: enlaceCorreo(proveedorSalud.value?.nombre),
  };
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

            <a
              v-if="modalContent.contactoCorreo"
              :href="modalContent.contactoCorreo"
              data-testid="modal-suscripcion-correo"
              class="text-center text-sm text-emerald-700 underline"
            >
              o escríbenos a {{ CORREO_RAMAZZINI }}
            </a>

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
