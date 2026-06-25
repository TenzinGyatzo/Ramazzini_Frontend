<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useTreatmentConsent } from '@/composables/useTreatmentConsent';
import { useActiveFirmante } from '@/composables/useActiveFirmante';
import { useRegulatoryPolicy } from '@/composables/useRegulatoryPolicy';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import type { ConsentimientoCreated } from '@/types/consentimiento';
import { ConsentimientoMetodo } from '@/types/consentimiento';

export interface TreatmentConsentModalProps {
  trabajadorId: string;
  trabajadorNombre: string;
  open: boolean;
}

const props = defineProps<TreatmentConsentModalProps>();

const emit = defineEmits<{
  (e: 'registered', consent: ConsentimientoCreated): void;
  (e: 'cancel'): void;
}>();

const { dailyConsentEnabled } = useRegulatoryPolicy();
const { firmanteDisplayName } = useActiveFirmante();
const {
  error,
  isLoading,
  hasError,
  reset,
  checkStatus,
  registerConsent,
} = useTreatmentConsent();

const checkboxChecked = ref(false);
const consentMethod = ref<ConsentimientoMetodo>(ConsentimientoMetodo.VERBAL);
const consentText = ref('');
const declaracionProfesional = ref('');

const canSubmit = computed(() => checkboxChecked.value && !isLoading.value);

const currentDateTime = computed(() =>
  new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
);

const handleCancel = () => {
  emit('cancel');
};

useEscapeToClose(handleCancel, () => props.open && !isLoading.value);

const loadConsentContent = async () => {
  if (!props.trabajadorId) return;

  const statusResult = await checkStatus(props.trabajadorId);
  consentText.value = statusResult?.consentText || '';
  declaracionProfesional.value = statusResult?.declaracionProfesional || '';
};

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      reset();
      checkboxChecked.value = false;
      consentMethod.value = ConsentimientoMetodo.VERBAL;
      await loadConsentContent();
      document.body.style.overflow = 'hidden';
    } else {
      reset();
      consentText.value = '';
      declaracionProfesional.value = '';
      document.body.style.overflow = '';
    }
  },
  { immediate: true },
);

const handleOverlayClick = () => {
  if (!isLoading.value) {
    handleCancel();
  }
};

const handleRegister = async () => {
  if (!canSubmit.value) return;

  const consent = await registerConsent({
    trabajadorId: props.trabajadorId,
    metodo: consentMethod.value,
  });

  if (consent) {
    emit('registered', consent);
  }
};

onUnmounted(() => {
  document.body.style.overflow = '';
  reset();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="dailyConsentEnabled && open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
      @click="handleOverlayClick"
    >
      <div
        class="bg-white rounded-2xl p-8 shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
        @click.stop
      >
        <div class="text-center mb-6">
          <div
            class="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4 treatment-consent-modal-icon"
          >
            <i class="fa-solid fa-file-signature text-2xl text-blue-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Consentimiento para tratamiento de información
          </h2>
          <div
            class="w-16 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full mx-auto"
          ></div>
        </div>

        <div class="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600">Trabajador:</span>
            <span class="text-sm text-gray-900 font-semibold">{{
              trabajadorNombre
            }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600"
              >Profesional que informa y registra:</span
            >
            <span class="text-sm text-gray-900 font-semibold">{{
              firmanteDisplayName
            }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600">Fecha/Hora:</span>
            <span class="text-sm text-gray-900 font-semibold">{{
              currentDateTime
            }}</span>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Leer al trabajador y solicitar su consentimiento:
          </label>
          <div
            class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto"
          >
            <p
              class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed text-justify"
            >
              {{ consentText }}
            </p>
          </div>
        </div>

        <div class="mb-6 dark-mode-input-surface">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Método de consentimiento
          </label>
          <select
            v-model="consentMethod"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :disabled="isLoading"
          >
            <option :value="ConsentimientoMetodo.VERBAL">VERBAL</option>
            <option :value="ConsentimientoMetodo.AUTOGRAFO">AUTOGRAFO</option>
          </select>
        </div>

        <div class="mb-6">
          <label class="flex items-start cursor-pointer">
            <input
              v-model="checkboxChecked"
              type="checkbox"
              class="mt-1 mr-3 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              :disabled="isLoading"
            />
            <span class="text-sm text-gray-700">
              {{ declaracionProfesional }}
            </span>
          </label>
        </div>

        <div
          v-if="hasError && error"
          class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <div class="flex items-center">
            <i class="fa-solid fa-exclamation-circle text-red-600 mr-2"></i>
            <p class="text-sm text-red-700">{{ error.message }}</p>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            type="button"
            class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isLoading"
            @click="handleCancel"
          >
            Cerrar
          </button>

          <button
            type="button"
            class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            :disabled="!canSubmit"
            @click="handleRegister"
          >
            <span
              v-if="isLoading"
              class="flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-spinner fa-spin"></i>
              Registrando...
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <i class="fa-solid fa-check"></i>
              Registrar consentimiento
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
