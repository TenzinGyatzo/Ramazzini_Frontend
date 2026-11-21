<script setup>
import { vValorDePartida } from '@/directives/valorDePartida';
import { useValorDePartida } from '@/composables/useValorDePartida';
import { ref, watch, onMounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  NOTA_MEDICA_CEX_RANGES,
  NOTA_MEDICA_CEX_SENTINEL,
  NOTA_MEDICA_CEX_MESSAGES,
  isBlankOrZero,
  isExplicitCexUnknown,
  parseOptionalNumber,
  mensajeErrorCexField,
} from '@/helpers/notaMedicaCexRanges';

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import NumeroCaptura from '@/components/steps/captura/NumeroCaptura.vue';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ERROR, CLASE_ETIQUETA } from '@/components/steps/captura/estiloCaptura';

// Al abrir el paso, si la glucemia está vacía, el cursor va a ella
useAutofocoPrimerVacio(['glucemia']);

const partida = useValorDePartida();
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

const glucemia = ref(null);
/** null = sin elegir; 0 = no, 1 = sí, -1 = «Se desconoce» (elegido a propósito) */
const tipoMedicion = ref(null);
const opcionesAyunas = [
  { value: 0, label: 'No (no fue en ayunas)' },
  { value: 1, label: 'Sí (fue en ayunas)' },
  { value: -1, label: 'Se desconoce' },
];
const resultadoObtenidoaTravesde = ref(-1);

// Captura rápida (punto 38): el valor y, al capturarlo, las dos preguntas a su lado
const capturaRapida = enCapturaRapida();
const OPCIONES_AYUNAS_CAPTURA = [
  { valor: 1, etiqueta: 'Sí' },
  { valor: 0, etiqueta: 'No' },
  { valor: -1, etiqueta: 'Se desconoce' },
];
const OPCIONES_RESULTADO_CAPTURA = [
  { valor: 1, etiqueta: 'Laboratorio' },
  { valor: 2, etiqueta: 'Tira capilar' },
];
const seDesconoceGlucemia = ref(false);

function getValFromSource(field) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined && formVal !== null) return formVal;
  if (docVal !== undefined && docVal !== null) return docVal;
  return undefined;
}

function resolveInitialGlucemia(saved) {
  if (saved === undefined || saved === null || saved === '') {
    if (documentos.currentDocument) {
      return { seDesconoce: true, display: null };
    }
    return { seDesconoce: false, display: null };
  }
  if (isExplicitCexUnknown('glucemia', saved)) {
    return { seDesconoce: true, display: null };
  }
  return { seDesconoce: false, display: Number(saved) };
}

function hasGlucemiaCapturada() {
  if (seDesconoceGlucemia.value) return false;
  return !isBlankOrZero(glucemia.value);
}

function resetConditionalFields() {
  tipoMedicion.value = null;
  resultadoObtenidoaTravesde.value = -1;
}

function syncFormData() {
  if (seDesconoceGlucemia.value) {
    formDataNotaMedica.glucemia = NOTA_MEDICA_CEX_SENTINEL.glucemia;
    formDataNotaMedica.tipoMedicion = -1;
    formDataNotaMedica.resultadoObtenidoaTravesde = -1;
  } else if (isBlankOrZero(glucemia.value)) {
    formDataNotaMedica.glucemia = null;
    formDataNotaMedica.tipoMedicion = -1;
    formDataNotaMedica.resultadoObtenidoaTravesde = -1;
  } else {
    formDataNotaMedica.glucemia = Number(glucemia.value);
    formDataNotaMedica.tipoMedicion = tipoMedicion.value;
    formDataNotaMedica.resultadoObtenidoaTravesde = resultadoObtenidoaTravesde.value;
  }
}

// Vacío → «Se desconoce» ya no se aplica al salir del paso, sino al guardar
// (prepararNotaMedicaParaGuardar). Si eso ocurre con el paso a la vista, la casilla lo refleja.
watch(
  () => formDataNotaMedica.glucemia,
  (valor) => {
    if (valor === NOTA_MEDICA_CEX_SENTINEL.glucemia && !seDesconoceGlucemia.value) {
      seDesconoceGlucemia.value = true;
    }
  },
);

onMounted(() => {
  const init = resolveInitialGlucemia(getValFromSource('glucemia'));
  seDesconoceGlucemia.value = init.seDesconoce;
  glucemia.value = init.display;

  if (hasGlucemiaCapturada()) {
    // Con cifra de glucemia, un -1 guardado es «Se desconoce» elegido
    tipoMedicion.value = getValFromSource('tipoMedicion') ?? null;
    resultadoObtenidoaTravesde.value =
      getValFromSource('resultadoObtenidoaTravesde') ?? -1;
  } else {
    resetConditionalFields();
  }

  syncFormData();
});

watch(seDesconoceGlucemia, (v) => {
  if (v) {
    glucemia.value = null;
    resetConditionalFields();
  }
  syncFormData();
});

watch(glucemia, () => {
  if (!hasGlucemiaCapturada()) {
    resetConditionalFields();
  }
  syncFormData();
});

watch([tipoMedicion, resultadoObtenidoaTravesde], () => {
  syncFormData();
});

const mensajeErrorGlucemia = computed(() =>
  mensajeErrorCexField('glucemia', glucemia.value, seDesconoceGlucemia.value),
);

const mensajeErrorTipoMedicion = computed(() => {
  if (!hasGlucemiaCapturada()) return '';
  if (![0, 1, -1].includes(tipoMedicion.value)) {
    return NOTA_MEDICA_CEX_MESSAGES.tipoMedicion;
  }
  return '';
});

const mensajeErrorResultado = computed(() => {
  if (!hasGlucemiaCapturada()) return '';
  if (
    resultadoObtenidoaTravesde.value !== 1 &&
    resultadoObtenidoaTravesde.value !== 2
  ) {
    return NOTA_MEDICA_CEX_MESSAGES.resultadoObtenidoaTravesde;
  }
  return '';
});

/** Condicionales solo si hay valor numérico de glucemia (no vacío / 0 / desconocido). */
const showConditionalFields = computed(() => hasGlucemiaCapturada());
const ranges = NOTA_MEDICA_CEX_RANGES;
</script>

<template>
  <div v-if="capturaRapida" class="nota-medica-dark-inputs">
    <p :class="[CLASE_AYUDA, 'mb-3']">Marque «Se desconoce» si no se registró el dato.</p>
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,14rem)_auto_auto] gap-x-6 gap-y-4 items-start">
      <NumeroCaptura
        id="glucemia"
        data-campo="glucemia"
        v-model="glucemia"
        v-model:se-desconoce="seDesconoceGlucemia"
        etiqueta="Glucemia"
        unidad="mg/dl"
        obligatorio
        con-se-desconoce
        placeholder="20-999"
        :min="ranges.glucemia.min"
        :max="ranges.glucemia.max"
        :error="mensajeErrorGlucemia"
        :partida="partida('glucosa')"
      />
      <template v-if="showConditionalFields">
        <div data-campo="tipoMedicion">
          <p :class="[CLASE_ETIQUETA, 'mb-1']">¿Fue en ayunas? <span class="text-red-500">*</span></p>
          <OpcionesSegmentadas
            v-model="tipoMedicion"
            name="tipoMedicion"
            etiqueta="¿Fue en ayunas?"
            :opciones="OPCIONES_AYUNAS_CAPTURA"
          />
          <p v-if="mensajeErrorTipoMedicion" :class="CLASE_ERROR">{{ mensajeErrorTipoMedicion }}</p>
        </div>
        <div data-campo="resultadoObtenidoaTravesde">
          <p :class="[CLASE_ETIQUETA, 'mb-1']">Obtenido por <span class="text-red-500">*</span></p>
          <OpcionesSegmentadas
            v-model="resultadoObtenidoaTravesde"
            name="resultadoObtenidoaTravesde"
            etiqueta="Resultado obtenido a través de"
            :opciones="OPCIONES_RESULTADO_CAPTURA"
          />
          <p v-if="mensajeErrorResultado" :class="CLASE_ERROR">{{ mensajeErrorResultado }}</p>
        </div>
      </template>
    </div>
  </div>

  <div v-else class="nota-medica-dark-inputs">
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

    <div data-campo="glucemia" class="mb-6">
      <label for="glucemia">Glucemia (mg/dl) <span class="text-red-500">*</span></label>
      <div class="mt-1 flex items-center gap-4">
        <input
          type="number"
          id="glucemia"
          class="w-1/2 p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          :value="glucemia ?? ''" v-valor-de-partida="partida('glucosa')"
          @input="glucemia = parseOptionalNumber($event.target.value)"
          :min="ranges.glucemia.min"
          :max="ranges.glucemia.max"
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
        <div data-campo="tipoMedicion">
          <label class="block text-base font-medium text-gray-800 mb-3">
            ¿La medición fue en ayunas? <span class="text-red-500">*</span>
          </label>
          <!-- Se acomodan solas: tres en fila si caben, si no la que sobra baja y ocupa todo el ancho -->
          <div class="flex flex-wrap gap-3">
            <label
              v-for="opcion in opcionesAyunas"
              :key="opcion.value"
              :class="[
                'relative flex flex-1 basis-48 items-center justify-center text-center py-2.5 px-8 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                tipoMedicion === opcion.value
                  ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
                  : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30',
              ]"
            >
              <input type="radio" :value="opcion.value" v-model="tipoMedicion" class="sr-only" />
              <span
                :class="[
                  'text-sm transition-colors duration-200',
                  tipoMedicion === opcion.value ? 'text-emerald-700 font-semibold' : 'text-gray-700',
                ]"
              >
                {{ opcion.label }}
              </span>
              <div
                v-if="tipoMedicion === opcion.value"
                class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </label>
          </div>
          <p v-if="mensajeErrorTipoMedicion" class="text-red-500 text-sm mt-2">{{ mensajeErrorTipoMedicion }}</p>
        </div>

        <div data-campo="resultadoObtenidoaTravesde">
          <label class="block text-base font-medium text-gray-800 mb-3">
            Resultado obtenido a través de <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              :class="[
                'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                resultadoObtenidoaTravesde === 1
                  ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
                  : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30',
              ]"
            >
              <input type="radio" :value="1" v-model="resultadoObtenidoaTravesde" class="sr-only" />
              <span
                :class="[
                  'text-sm transition-colors duration-200',
                  resultadoObtenidoaTravesde === 1 ? 'text-emerald-700 font-semibold' : 'text-gray-700',
                ]"
              >
                Laboratorio
              </span>
              <div
                v-if="resultadoObtenidoaTravesde === 1"
                class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </label>

            <label
              :class="[
                'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                resultadoObtenidoaTravesde === 2
                  ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
                  : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30',
              ]"
            >
              <input type="radio" :value="2" v-model="resultadoObtenidoaTravesde" class="sr-only" />
              <span
                :class="[
                  'text-sm transition-colors duration-200 text-center',
                  resultadoObtenidoaTravesde === 2 ? 'text-emerald-700 font-semibold' : 'text-gray-700',
                ]"
              >
                Tira de glucosa capilar
              </span>
              <div
                v-if="resultadoObtenidoaTravesde === 2"
                class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </label>
          </div>
          <p v-if="mensajeErrorResultado" class="text-red-500 text-sm mt-2">{{ mensajeErrorResultado }}</p>
        </div>
      </div>
    </transition>
  </div>
</template>
