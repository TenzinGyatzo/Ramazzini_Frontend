<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['close', 'confirm']);

const reason = ref('');
const confirmChecked = ref(false);

const canSubmit = computed(() => {
  return reason.value.trim().length > 0 && confirmChecked.value;
});

const handleSubmit = () => {
  if (canSubmit.value) {
    emit('confirm', reason.value.trim());
  }
};

const handleClose = () => {
  reason.value = '';
  confirmChecked.value = false;
  emit('close');
};

const features = [
  { name: 'UI SIRES', description: 'Interfaz específica para cumplimiento SIRES/NOM-024-SSA3-2012' },
  { name: 'Timeout de sesión', description: 'La sesión se bloqueará automáticamente tras inactividad' },
  { name: 'Inmutabilidad de documentos', description: 'Los documentos no podrán ser editados después de finalizarse' },
  { name: 'Notas aclaratorias', description: 'Funcionalidad de notas aclaratorias habilitada' },
  { name: 'Validaciones regulatorias', description: 'CURP, CIE-10 y campos geográficos serán obligatorios' },
  { name: 'Campo CLUES', description: 'Visible y validado contra catálogo oficial' },
  { name: 'Exportación GIIS', description: 'Habilitada para integración con GIIS' },
  { name: 'Consentimiento', description: 'Funcionalidad de consentimiento habilitada' },
  { name: 'Auditoría de cambios', description: 'Funcionalidad de auditoría de cambios habilitada' },
];
</script>

<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click.self="handleClose"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-800">
            Activar SIRES (NOM-024-SSA3-2012)
          </h2>
          <button
            @click="handleClose"
            class="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 rounded p-1"
            aria-label="Cerrar modal"
          >
            <i class="fa-solid fa-times text-xl"></i>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 space-y-6">
        <!-- Advertencia -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="fa-solid fa-triangle-exclamation text-amber-600 text-xl mt-0.5"></i>
            <div>
              <p class="font-medium text-amber-800 mb-1">
                Importante: Cambio Irreversible
              </p>
              <p class="text-sm text-amber-700">
                Este cambio activará todas las funcionalidades regulatorias de SIRES. 
                Una vez activado, no podrás desactivarlo desde esta interfaz. 
                Para desactivar SIRES, deberás contactar a soporte.
              </p>
            </div>
          </div>
        </div>

        <!-- Implicaciones -->
        <div>
          <h3 class="font-semibold text-gray-800 mb-3">
            Funcionalidades que se activarán:
          </h3>
          <ul class="space-y-2">
            <li
              v-for="(feature, index) in features"
              :key="index"
              class="flex items-start gap-2 text-sm text-gray-700"
            >
              <i class="fa-solid fa-check-circle text-emerald-600 mt-0.5"></i>
              <div>
                <span class="font-medium">{{ feature.name }}: </span>
                <span class="text-gray-600"> {{ feature.description }}</span>
              </div>
            </li>
          </ul>
        </div>

        <!-- Checkbox de confirmación -->
        <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              v-model="confirmChecked"
              class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">
              Entiendo las implicaciones de activar SIRES (NOM-024-SSA3-2012) y acepto que 
              todas las funcionalidades regulatorias se habilitarán inmediatamente. 
              Soy consciente de que este cambio requiere contactar a soporte para revertirlo.
            </span>
          </label>
        </div>

        <!-- Campo motivo -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Motivo del cambio <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="reason"
            rows="4"
            placeholder="Describe el motivo por el cual necesitas activar SIRES (NOM-024-SSA3-2012)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxlength="500"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            {{ reason.length }}/500 caracteres
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end gap-3">
        <button
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Cancelar
        </button>
        <button
          @click="handleSubmit"
          :disabled="!canSubmit"
          :class="[
            'px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2',
            canSubmit
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          ]"
        >
          Confirmar Cambio
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Asegurar que el modal esté sobre otros elementos */
</style>