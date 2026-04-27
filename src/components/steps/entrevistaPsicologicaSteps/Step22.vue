<script setup>
import { watch, ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  CONCLUSION_SIN_HALLAZGOS,
  esConclusionSinHallazgos,
  generarConclusionClinica,
  hayHallazgosSignificativos,
} from '@/helpers/conclusionEntrevistaPsicologica';

const formDataStore = useFormDataStore();
const { formDataEntrevistaPsicologica } = storeToRefs(formDataStore);
const documentos = useDocumentosStore();

const conclusionClinicaPregunta = ref('No');
const conclusionClinica = ref('');

const textareaConclusion = ref(null);

const conclusionAutomatica = computed(() =>
  generarConclusionClinica(formDataEntrevistaPsicologica.value || {}),
);

const hayHallazgosAutomaticos = computed(() =>
  hayHallazgosSignificativos(formDataEntrevistaPsicologica.value || {}),
);

onMounted(() => {
  if (documentos.currentDocument) {
    const conclDoc = documentos.currentDocument.conclusionClinica || '';
    conclusionClinica.value = conclDoc;

    if (hayHallazgosAutomaticos.value || (conclDoc && !esConclusionSinHallazgos(conclDoc))) {
      conclusionClinicaPregunta.value = 'Si';
    } else {
      conclusionClinicaPregunta.value = 'No';
    }
  } else if (hayHallazgosAutomaticos.value) {
    conclusionClinicaPregunta.value = 'Si';
    conclusionClinica.value = conclusionAutomatica.value;
    formDataEntrevistaPsicologica.value.conclusionClinica = conclusionAutomatica.value;
  } else {
    const previo = formDataEntrevistaPsicologica.value.conclusionClinica;
    if (!previo || esConclusionSinHallazgos(previo)) {
      conclusionClinicaPregunta.value = 'No';
    } else {
      conclusionClinicaPregunta.value = 'Si';
      conclusionClinica.value = previo;
    }
  }
});

onUnmounted(() => {
  if (conclusionClinicaPregunta.value === 'No') {
    formDataEntrevistaPsicologica.value.conclusionClinica = CONCLUSION_SIN_HALLAZGOS;
  } else {
    formDataEntrevistaPsicologica.value.conclusionClinica =
      conclusionClinica.value || conclusionAutomatica.value || '';
  }
});

watch(conclusionClinica, (newValue) => {
  formDataEntrevistaPsicologica.value.conclusionClinica = newValue;
});

watch(conclusionClinicaPregunta, async (newValue) => {
  if (newValue === 'No') {
    formDataEntrevistaPsicologica.value.conclusionClinica = CONCLUSION_SIN_HALLAZGOS;
    conclusionClinica.value = CONCLUSION_SIN_HALLAZGOS;
  }
  if (newValue === 'Si') {
    if (!conclusionClinica.value || esConclusionSinHallazgos(conclusionClinica.value)) {
      conclusionClinica.value = conclusionAutomatica.value;
      formDataEntrevistaPsicologica.value.conclusionClinica = conclusionAutomatica.value;
    }
    await nextTick();
    textareaConclusion.value?.focus();
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Conclusión clínica</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">RESUMEN</h2>

    <div class="mb-8">
      <p class="text-lg font-medium mb-4 text-gray-800">¿Hay hallazgos significativos por resumir en la conclusión?</p>

      <div class="grid grid-cols-2 gap-3">
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            conclusionClinicaPregunta === 'No'
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            value="No"
            v-model="conclusionClinicaPregunta"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              conclusionClinicaPregunta === 'No' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              conclusionClinicaPregunta === 'No' ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            No
          </span>
          <div
            v-if="conclusionClinicaPregunta === 'No'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            conclusionClinicaPregunta === 'Si'
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            value="Si"
            v-model="conclusionClinicaPregunta"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              conclusionClinicaPregunta === 'Si' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              conclusionClinicaPregunta === 'Si' ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            Sí
          </span>
          <div
            v-if="conclusionClinicaPregunta === 'Si'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>

    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform -translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform -translate-y-2"
    >
      <div v-if="conclusionClinicaPregunta === 'Si'" class="mt-6">
        <p class="text-lg font-medium mb-3 text-gray-800">Conclusión clínica:</p>

        <div v-if="hayHallazgosAutomaticos" class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800">
            Se ha generado un borrador a partir de los hallazgos registrados en los pasos anteriores. Puede editarlo para ajustar redacción o matices clínicos.
          </p>
        </div>

        <textarea
          ref="textareaConclusion"
          v-model="conclusionClinica"
          data-skip-validation
          class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 min-h-[140px] resize-y"
          placeholder="Redacte la conclusión clínica integrando hallazgos y criterio profesional..."
        />
      </div>
    </transition>
  </div>
</template>
