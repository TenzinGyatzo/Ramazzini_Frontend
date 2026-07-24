<script setup>
import { ref, watch, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const glucemia = ref(0);
const tipoMedicion = ref(-1);
const resultadoObtenidoaTravesde = ref(-1);
const seDesconoceGlucemia = ref(true);

function getValFromSource(field, defaultVal) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined) return formVal;
  if (docVal !== undefined) return docVal;
  return defaultVal;
}

function syncFormData() {
  if (seDesconoceGlucemia.value) {
    // CEX: "Se desconoce" → null (validador skipea; transformer mapea a 0 en GIIS)
    formDataNotaMedica.glucemia = null;
    formDataNotaMedica.tipoMedicion = -1;
    formDataNotaMedica.resultadoObtenidoaTravesde = -1;
  } else {
    formDataNotaMedica.glucemia = glucemia.value;
    formDataNotaMedica.tipoMedicion = tipoMedicion.value;
    formDataNotaMedica.resultadoObtenidoaTravesde = resultadoObtenidoaTravesde.value;
  }
}

onMounted(() => {
  const savedGlucemia = getValFromSource('glucemia', 0);
  const savedTipo = getValFromSource('tipoMedicion', -1);
  const savedResultado = getValFromSource('resultadoObtenidoaTravesde', -1);

  // null/0 = "Se desconoce" (retrocompatibilidad)
  seDesconoceGlucemia.value = savedGlucemia == null || savedGlucemia === 0;
  glucemia.value = seDesconoceGlucemia.value ? 0 : savedGlucemia;
  tipoMedicion.value = savedTipo;
  resultadoObtenidoaTravesde.value = savedResultado;

  syncFormData();
});

watch(seDesconoceGlucemia, (v) => {
  if (v) {
    glucemia.value = 0;
    tipoMedicion.value = -1;
    resultadoObtenidoaTravesde.value = -1;
  } else {
    glucemia.value = glucemia.value || 80;
  }
  syncFormData();
});

watch([glucemia, tipoMedicion, resultadoObtenidoaTravesde], () => {
  syncFormData();
});

onUnmounted(() => {
  syncFormData();
});

const mensajeErrorGlucemia = computed(() => {
  if (seDesconoceGlucemia.value) return '';
  const v = Number(glucemia.value);
  if (v < 20) return 'CEX: mínimo 20 mg/dl';
  if (v > 999) return 'CEX: máximo 999 mg/dl';
  return '';
});

const showConditionalFields = computed(() => !seDesconoceGlucemia.value);
</script>

<template>
  <div>
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Glucemia
    </h2>
    <p
      v-if="variant !== 'compact'"
      class="text-sm text-gray-600 mb-4"
    >
      Marque "Se desconoce" si no se registró el dato.
    </p>
    <p
      v-else
      class="text-xs text-gray-600 mb-2"
    >
      Marque "Se desconoce" si no se registró el dato.
    </p>

    <div class="mb-6">
      <label for="glucemia">Glucemia (mg/dl) <span class="text-red-500">*</span></label>
      <div class="mt-1 flex items-center gap-4">
        <input
          type="number"
          id="glucemia"
          class="w-1/2 p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          v-model.number="glucemia"
          :min="20"
          :max="999"
          step="1"
          placeholder="20-999"
          :disabled="seDesconoceGlucemia"
        />
        <label class="w-1/2 flex items-center gap-1.5 text-sm">
          <input type="checkbox" v-model="seDesconoceGlucemia" class="rounded" />
          Se desconoce
        </label>
      </div>
      <p v-if="mensajeErrorGlucemia" class="text-red-500 text-sm mt-1">{{ mensajeErrorGlucemia }}</p>
    </div>

    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showConditionalFields" class="space-y-6">
        <div>
          <label class="block text-base font-medium text-gray-800 mb-2">¿La medición fue en ayunas? <span class="text-red-500">*</span></label>
          <div class="flex gap-6">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" :value="0" v-model="tipoMedicion" class="text-emerald-600 focus:ring-emerald-500" />
              No (no fue en ayunas)
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" :value="1" v-model="tipoMedicion" class="text-emerald-600 focus:ring-emerald-500" />
              Sí (fue en ayunas)
            </label>
          </div>
        </div>

        <div>
          <label class="block text-base font-medium text-gray-800 mb-2">Resultado obtenido a través de <span class="text-red-500">*</span></label>
          <div class="flex gap-6">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" :value="1" v-model="resultadoObtenidoaTravesde" class="text-emerald-600 focus:ring-emerald-500" />
              Laboratorio
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" :value="2" v-model="resultadoObtenidoaTravesde" class="text-emerald-600 focus:ring-emerald-500" />
              Tira de glucosa capilar
            </label>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
