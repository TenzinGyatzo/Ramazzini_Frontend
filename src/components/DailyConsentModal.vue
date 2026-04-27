<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useDailyConsent } from '@/composables/useDailyConsent';
import { useActiveFirmante } from '@/composables/useActiveFirmante';
import { useRegulatoryPolicy } from '@/composables/useRegulatoryPolicy';
import type { ConsentimientoCreated, ConsentMethod } from '@/types/consentimiento-diario';
import { ConsentMethod as ConsentMethodEnum } from '@/types/consentimiento-diario';

// Props
export interface DailyConsentModalProps {
  trabajadorId: string;
  trabajadorNombre: string;
  trabajadorSexo?: string; // 'Masculino' | 'Femenino' para determinar género en el texto
  open: boolean;
  dateKey?: string; // Opcional, backend lo calcula si no se envía
}

const props = defineProps<DailyConsentModalProps>();

// Emits
const emit = defineEmits<{
  (e: 'registered', consent: ConsentimientoCreated): void;
  (e: 'cancel'): void;
}>();

// Composables
const { dailyConsentEnabled } = useRegulatoryPolicy();
const { firmanteDisplayName } = useActiveFirmante();
const {
  state,
  error,
  isLoading,
  hasError,
  currentDateKey,
  reset,
  checkStatus,
  registerConsent,
} = useDailyConsent();

// Estado local
const checkboxChecked = ref(false);
const consentMethod = ref<ConsentMethod>(ConsentMethodEnum.VERBAL);
const modalRef = ref<HTMLElement>();
const displayedDateKey = ref<string | null>(null);

// Texto del consentimiento (placeholder por ahora)
const consentText = ref(
  'Antes de iniciar su atención médica, le informo lo siguiente:\n\nLa atención médica que se le brindará el día de hoy es parte de los exámenes y revisiones médicas relacionados con su trabajo, y para ello será necesario recabar información relacionada con su estado de salud.\n\nSus datos personales y datos de salud serán tratados de forma confidencial, resguardados de manera segura y utilizados únicamente para los fines derivados de su atención médica ocupacional y de las obligaciones legales correspondientes.\n\nEsta información podrá ser consultada exclusivamente por el personal de salud autorizado y, en su caso, compartida con la empresa o autoridades competentes únicamente cuando la ley lo permita.\n\nUsted tiene derecho a la privacidad, así como a acceder a su información médica cuando lo solicite.\n\nEl consentimiento que otorgue aplica únicamente para la atención médica que se le brindará el día de hoy.\n\n¿Está usted de acuerdo en otorgar su consentimiento para recibir la atención médica ocupacional y para el tratamiento de sus datos personales de salud en esta fecha?');

// Validaciones
const canSubmit = computed(() => checkboxChecked.value && !isLoading.value);

// Texto dinámico del checkbox según sexo del trabajador y método seleccionado
const checkboxText = computed(() => {
  const sexo = props.trabajadorSexo?.toLowerCase() || '';
  const esFemenino = sexo === 'femenino';
  
  // Determinar artículo y participio según sexo
  const articulo = esFemenino ? 'la' : 'el';
  const trabajadorTexto = esFemenino ? 'trabajadora' : 'trabajador';
  const informadoTexto = esFemenino ? 'informada' : 'informado';
  
  // Determinar método de consentimiento
  const metodoTexto = consentMethod.value === ConsentMethodEnum.AUTOGRAFO 
    ? 'autógrafo' 
    : 'verbal';
  
  return `Declaro que ${articulo} ${trabajadorTexto} fue ${informadoTexto} y otorgó su consentimiento ${metodoTexto} para la atención médica ocupacional en la fecha de hoy.`;
});

// Fecha/hora actual formateada
const currentDateTime = computed(() => {
  const now = new Date();
  const dateKey = displayedDateKey.value || currentDateKey.value || props.dateKey;
  
  if (dateKey) {
    // Formatear dateKey (YYYY-MM-DD) a formato legible
    const [year, month, day] = dateKey.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${formattedDate} ${formattedTime}`;
  }
  
  return now.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

// Watch para manejar apertura/cierre del modal
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    // Resetear estado
    reset();
    checkboxChecked.value = false;
    consentMethod.value = ConsentMethodEnum.VERBAL;
    displayedDateKey.value = props.dateKey || null;
    
    // Si no hay dateKey, obtener status para obtener dateKey del backend
    if (!props.dateKey) {
      await checkStatus(props.trabajadorId);
    } else {
      displayedDateKey.value = props.dateKey;
    }
  } else {
    reset();
  }
});

// Función para registrar consentimiento
const handleRegister = async () => {
  if (!canSubmit.value) return;

  try {
    const createDto = {
      trabajadorId: props.trabajadorId,
      consentMethod: consentMethod.value,
      dateKey: displayedDateKey.value || currentDateKey.value || props.dateKey,
    };

    const consent = await registerConsent(createDto);
    
    if (consent) {
      emit('registered', consent);
    }
  } catch (err) {
    // El error ya está manejado en el composable
    console.error('Error al registrar consentimiento:', err);
  }
};

// Función para cancelar
const handleCancel = () => {
  emit('cancel');
};

// Prevenir cerrar con click fuera (no hacer nada, modal bloqueante)
const handleOverlayClick = () => {
  // No hacer nada - modal bloqueante
};

onUnmounted(() => {
  reset();
});
</script>

<template>
  <!-- Modal solo visible si dailyConsentEnabled es true -->
  <Teleport to="body">
    <div
      v-if="dailyConsentEnabled && open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
      @click="handleOverlayClick"
    >
      <div
        ref="modalRef"
        class="bg-white rounded-2xl p-8 shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
        @click.stop
      >
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4 daily-consent-modal-icon">
            <i class="fa-solid fa-file-signature text-2xl text-blue-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Consentimiento Informado
          </h2>
          <div class="w-16 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full mx-auto"></div>
        </div>

        <!-- Identificación no editable -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600">Trabajador:</span>
            <span class="text-sm text-gray-900 font-semibold">{{ trabajadorNombre }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600">Profesional que informa y registra:</span>
            <span class="text-sm text-gray-900 font-semibold">{{ firmanteDisplayName }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600">Fecha/Hora:</span>
            <span class="text-sm text-gray-900 font-semibold">{{ currentDateTime }}</span>
          </div>
        </div>

        <!-- Texto del consentimiento (no editable) -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Leer al trabajador y solicitar su consentimiento:
          </label>
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed text-justify">
              {{ consentText }}
            </p>
          </div>
        </div>

        <!-- Método de consentimiento -->
        <div class="mb-6 dark-mode-input-surface">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Método de Consentimiento
          </label>
          <select
            v-model="consentMethod"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :disabled="isLoading"
          >
            <option :value="ConsentMethodEnum.VERBAL">VERBAL</option>
            <option :value="ConsentMethodEnum.AUTOGRAFO">AUTOGRAFO</option>
          </select>
        </div>

        <!-- Checkbox requerido -->
        <div class="mb-6">
          <label class="flex items-start cursor-pointer">
            <input
              v-model="checkboxChecked"
              type="checkbox"
              class="mt-1 mr-3 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              :disabled="isLoading"
            />
            <span class="text-sm text-gray-700">
              {{ checkboxText }}
            </span>
          </label>
        </div>

        <!-- Mensaje de error -->
        <div
          v-if="hasError && error"
          class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <div class="flex items-center">
            <i class="fa-solid fa-exclamation-circle text-red-600 mr-2"></i>
            <p class="text-sm text-red-700">{{ error.message }}</p>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex gap-4">
          <!-- Botón secundario: Cancelar -->
          <button
            type="button"
            class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isLoading"
            @click="handleCancel"
          >
            Cancelar
          </button>

          <!-- Botón primario: Registrar -->
          <button
            type="button"
            class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            :disabled="!canSubmit"
            @click="handleRegister"
          >
            <span v-if="isLoading" class="flex items-center justify-center gap-2">
              <i class="fa-solid fa-spinner fa-spin"></i>
              Registrando...
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <i class="fa-solid fa-check"></i>
              Registrar consentimiento y continuar
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Estilos adicionales si es necesario */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
