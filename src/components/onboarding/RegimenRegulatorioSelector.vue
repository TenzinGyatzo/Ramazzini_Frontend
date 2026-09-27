<script setup>
import { onUnmounted, ref, watch } from 'vue';
import RegimenHelpModal from './RegimenHelpModal.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
    validator: (value) => value === null || value === 'SIRES_NOM024' || value === 'SIN_REGIMEN' || value === 'NO_SUJETO_SIRES'
  }
});

const emit = defineEmits(['update:modelValue', 'update:declaracion']);

const regimenSeleccionado = ref(props.modelValue);
const declaracionAceptada = ref(false);
const showHelpModal = ref(false);
const detalleListo = ref(
  props.modelValue === 'SIRES_NOM024' ||
  props.modelValue === 'SIN_REGIMEN' ||
  props.modelValue === 'NO_SUJETO_SIRES'
);
let detalleTimer = null;

const programarDetalle = (regimen) => {
  window.clearTimeout(detalleTimer);
  detalleListo.value = false;
  if (regimen !== 'SIRES_NOM024' && regimen !== 'SIN_REGIMEN') return;

  const anchoGrande = window.matchMedia('(min-width: 768px)').matches;
  if (!anchoGrande) {
    detalleListo.value = true;
    return;
  }

  detalleTimer = window.setTimeout(() => {
    detalleListo.value = true;
  }, 300);
};

onUnmounted(() => {
  window.clearTimeout(detalleTimer);
});

watch(() => props.modelValue, (newValue) => {
  if (newValue === 'NO_SUJETO_SIRES') {
    regimenSeleccionado.value = 'SIN_REGIMEN';
  } else {
    regimenSeleccionado.value = newValue;
  }
  if (newValue !== 'SIN_REGIMEN' && newValue !== 'NO_SUJETO_SIRES') {
    declaracionAceptada.value = false;
  }
});

watch(regimenSeleccionado, (newValue) => {
  emit('update:modelValue', newValue);
  if (newValue !== 'SIN_REGIMEN') {
    declaracionAceptada.value = false;
    emit('update:declaracion', false);
  }
  programarDetalle(newValue);
});

watch(declaracionAceptada, (newValue) => {
  emit('update:declaracion', newValue);
});

const openHelpModal = () => {
  showHelpModal.value = true;
};

const closeHelpModal = () => {
  showHelpModal.value = false;
};

const applySuggestion = (suggestion) => {
  regimenSeleccionado.value = suggestion;
  closeHelpModal();
};

const selectRegimen = (regimen) => {
  regimenSeleccionado.value = regimen;
};
</script>

<template>
  <div class="mb-2">
    <div class="flex items-center justify-between gap-2 mb-2">
      <h3 class="text-base font-medium text-gray-800">
        ¿Cómo debe operar tu cuenta?
      </h3>
      <button
        type="button"
        @click="openHelpModal"
        class="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded px-2 py-1 shrink-0"
        aria-label="Abrir ayuda para elegir régimen regulatorio"
      >
        <i class="fas fa-question-circle"></i>
        <span>Ayúdame a elegir</span>
      </button>
    </div>

    <p class="mb-3 text-sm text-amber-800">
      Esta elección queda fija en esta cuenta. Para usar el otro régimen tendrás que crear otra cuenta.
    </p>

    <div class="flex flex-col md:flex-row md:items-start gap-3">
      <div
        class="min-w-0 w-full md:w-auto rounded-lg border-2 md:transition-[flex] md:duration-300 md:ease-out"
        :class="[
          regimenSeleccionado === 'SIRES_NOM024'
            ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200 md:flex-[2]'
            : 'border-gray-200 bg-white hover:border-emerald-300',
          regimenSeleccionado === 'SIN_REGIMEN' ? 'md:flex-[1]' : '',
          !regimenSeleccionado ? 'md:flex-1' : '',
        ]"
      >
        <label class="flex items-start p-4 cursor-pointer">
          <input
            type="radio"
            name="regimenRegulatorio"
            value="SIRES_NOM024"
            :checked="regimenSeleccionado === 'SIRES_NOM024'"
            @change="selectRegimen('SIRES_NOM024')"
            class="sr-only"
            aria-label="Seleccionar régimen SIRES (NOM-024)"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <div class="font-semibold text-gray-800 flex-1">
                SIRES — NOM-024
              </div>
              <i
                v-if="regimenSeleccionado === 'SIRES_NOM024'"
                class="fas fa-check-circle text-emerald-600 text-lg"
              ></i>
            </div>
            <p
              v-if="regimenSeleccionado !== 'SIN_REGIMEN'"
              class="text-sm text-gray-600"
            >
              Cumplimiento estricto. Pide CLUES.
            </p>
          </div>
        </label>
        <div
          v-if="detalleListo && regimenSeleccionado === 'SIRES_NOM024'"
          class="detalle-fade px-4 pb-4 space-y-3"
        >
          <slot name="sires-extra" />
        </div>
      </div>

      <div
        class="min-w-0 w-full md:w-auto rounded-lg border-2 md:transition-[flex] md:duration-300 md:ease-out"
        :class="[
          regimenSeleccionado === 'SIN_REGIMEN'
            ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200 md:flex-[2]'
            : 'border-gray-200 bg-white hover:border-emerald-300',
          regimenSeleccionado === 'SIRES_NOM024' ? 'md:flex-[1]' : '',
          !regimenSeleccionado ? 'md:flex-1' : '',
        ]"
      >
        <label class="flex items-start p-4 cursor-pointer">
          <input
            type="radio"
            name="regimenRegulatorio"
            value="SIN_REGIMEN"
            :checked="regimenSeleccionado === 'SIN_REGIMEN'"
            @change="selectRegimen('SIN_REGIMEN')"
            class="sr-only"
            aria-label="Continuar sin régimen regulatorio"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <div class="font-semibold text-gray-800 flex-1">
                Sin régimen
              </div>
              <i
                v-if="regimenSeleccionado === 'SIN_REGIMEN'"
                class="fas fa-check-circle text-emerald-600 text-lg"
              ></i>
            </div>
            <p
              v-if="regimenSeleccionado !== 'SIRES_NOM024'"
              class="text-sm text-gray-600"
            >
              Operación clínica general. Menos validaciones normativas.
            </p>
          </div>
        </label>
        <div
          v-if="detalleListo && regimenSeleccionado === 'SIN_REGIMEN'"
          class="detalle-fade px-4 pb-4"
        >
          <label class="flex items-start cursor-pointer rounded-lg border border-amber-200 bg-amber-50 p-3">
            <input
              type="checkbox"
              v-model="declaracionAceptada"
              class="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 rounded border-gray-300"
              aria-label="Aceptar declaración para continuar sin régimen regulatorio"
            />
            <span class="ml-3 text-sm text-gray-800">
              Entiendo que esta cuenta operará sin régimen regulatorio y que no podré cambiarlo aquí. Para usar SIRES tendré que registrar otra cuenta.
              <span class="text-red-500">*</span>
            </span>
          </label>
        </div>
      </div>
    </div>

    <RegimenHelpModal
      v-if="showHelpModal"
      @close="closeHelpModal"
      @apply-suggestion="applySuggestion"
    />
  </div>
</template>

<style scoped>
.detalle-fade {
  animation: detalle-in 180ms ease;
}

@keyframes detalle-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
