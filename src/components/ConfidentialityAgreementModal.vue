<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';

export interface ConfidentialityAgreementModalProps {
  open: boolean;
  agreementText: string;
  footerConsent: string;
  isLoading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<ConfidentialityAgreementModalProps>(), {
  isLoading: false,
  error: null,
});

const emit = defineEmits<{
  (e: 'accepted'): void;
  (e: 'logout'): void;
}>();

const userStore = useUserStore();
const checkboxChecked = ref(false);

const canSubmit = computed(() => checkboxChecked.value && !props.isLoading);

const handleOverlayClick = () => {
  // Modal bloqueante: no cerrar con click fuera
};

const handleAccept = () => {
  if (!canSubmit.value) return;
  emit('accepted');
};

const handleLogout = async () => {
  emit('logout');
  await userStore.logout();
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      checkboxChecked.value = false;
    } else {
      document.body.style.overflow = '';
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/75 backdrop-blur-sm"
      @click="handleOverlayClick"
    >
      <div
        class="bg-white rounded-2xl p-8 shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
            <i class="fa-solid fa-shield-halved text-2xl text-blue-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Acuerdo de Confidencialidad y Uso de la Información
          </h2>
          <div class="w-16 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full mx-auto"></div>
        </div>

        <p class="text-sm text-gray-600 mb-2 leading-relaxed text-justify">
          Al acceder y utilizar RAMAZZINI, el usuario reconoce, acepta y se compromete a lo siguiente:
        </p>

        <div class="mb-6">
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed text-justify">
              {{ agreementText }}
            </p>
          </div>
        </div>

        <p class="text-sm text-gray-600 mb-6 leading-relaxed text-justify">
          {{ footerConsent }}
        </p>

        <label class="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            v-model="checkboxChecked"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-700">
            He leído y comprendo el Acuerdo de Confidencialidad y Uso de la Información
          </span>
        </label>

        <p v-if="error" class="text-sm text-red-600 mb-4 text-center">
          {{ error }}
        </p>

        <div class="flex flex-col items-center gap-4">
          <button
            type="button"
            class="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-white transition-colors"
            :class="canSubmit
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'"
            :disabled="!canSubmit"
            @click="handleAccept"
          >
            <span v-if="isLoading">
              <i class="fa-solid fa-spinner fa-spin mr-2"></i>
              Registrando...
            </span>
            <span v-else>Acepto el Acuerdo</span>
          </button>

          <button
            type="button"
            class="text-sm text-gray-500 hover:text-gray-700 underline"
            @click="handleLogout"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
