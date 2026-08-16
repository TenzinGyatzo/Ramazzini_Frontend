<script setup>
import { ref, watch, onMounted, onUnmounted, computed, toRefs, nextTick } from 'vue';
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

const tensionArterialSistolica = ref(null);
const tensionArterialDiastolica = ref(null);
const frecuenciaCardiaca = ref(null);
const frecuenciaRespiratoria = ref(null);
const temperatura = ref(null);
const saturacionOxigeno = ref(null);

const seDesconoceSistolica = ref(false);
const seDesconoceDiastolica = ref(false);
const seDesconoceFrecuenciaCardiaca = ref(false);
const seDesconoceFrecuenciaRespiratoria = ref(false);
const seDesconoceTemperatura = ref(false);
const seDesconoceSaturacionOxigeno = ref(false);

function getValFromSource(field) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined && formVal !== null) return formVal;
  if (docVal !== undefined && docVal !== null) return docVal;
  return undefined;
}

function resolveInitial(field, saved) {
  if (saved === undefined || saved === null || saved === '') {
    // Documento existente sin el campo → ya quedó como desconocido; alta nueva → vacío
    if (documentos.currentDocument) {
      return { seDesconoce: true, display: null };
    }
    return { seDesconoce: false, display: null };
  }
  if (isExplicitCexUnknown(field, saved)) {
    return { seDesconoce: true, display: null };
  }
  return { seDesconoce: false, display: Number(saved) };
}

function toPersistedValue(field, seDesconoce, display) {
  if (seDesconoce) return NOTA_MEDICA_CEX_SENTINEL[field];
  if (isBlankOrZero(display)) return null;
  return Number(display);
}

function syncFormData() {
  formDataNotaMedica.tensionArterialSistolica = toPersistedValue(
    'tensionArterialSistolica',
    seDesconoceSistolica.value,
    tensionArterialSistolica.value,
  );
  formDataNotaMedica.tensionArterialDiastolica = toPersistedValue(
    'tensionArterialDiastolica',
    seDesconoceDiastolica.value,
    tensionArterialDiastolica.value,
  );
  formDataNotaMedica.frecuenciaCardiaca = toPersistedValue(
    'frecuenciaCardiaca',
    seDesconoceFrecuenciaCardiaca.value,
    frecuenciaCardiaca.value,
  );
  formDataNotaMedica.frecuenciaRespiratoria = toPersistedValue(
    'frecuenciaRespiratoria',
    seDesconoceFrecuenciaRespiratoria.value,
    frecuenciaRespiratoria.value,
  );
  formDataNotaMedica.temperatura = toPersistedValue(
    'temperatura',
    seDesconoceTemperatura.value,
    temperatura.value,
  );
  formDataNotaMedica.saturacionOxigeno = toPersistedValue(
    'saturacionOxigeno',
    seDesconoceSaturacionOxigeno.value,
    saturacionOxigeno.value,
  );
}

/** Al salir del paso: vacío o 0 → “Se desconoce”. */
function finalizeEmptyAsUnknown() {
  const fields = [
    { seDesconoce: seDesconoceSistolica, display: tensionArterialSistolica },
    { seDesconoce: seDesconoceDiastolica, display: tensionArterialDiastolica },
    { seDesconoce: seDesconoceFrecuenciaCardiaca, display: frecuenciaCardiaca },
    { seDesconoce: seDesconoceFrecuenciaRespiratoria, display: frecuenciaRespiratoria },
    { seDesconoce: seDesconoceTemperatura, display: temperatura },
    { seDesconoce: seDesconoceSaturacionOxigeno, display: saturacionOxigeno },
  ];
  for (const { seDesconoce, display } of fields) {
    if (!seDesconoce.value && isBlankOrZero(display.value)) {
      seDesconoce.value = true;
      display.value = null;
    }
  }
  if (seDesconoceSistolica.value || seDesconoceDiastolica.value) {
    seDesconoceSistolica.value = true;
    seDesconoceDiastolica.value = true;
    tensionArterialSistolica.value = null;
    tensionArterialDiastolica.value = null;
  }
}

onMounted(() => {
  const fields = [
    { key: 'tensionArterialSistolica', ref: tensionArterialSistolica, seDesconoce: seDesconoceSistolica },
    { key: 'tensionArterialDiastolica', ref: tensionArterialDiastolica, seDesconoce: seDesconoceDiastolica },
    { key: 'frecuenciaCardiaca', ref: frecuenciaCardiaca, seDesconoce: seDesconoceFrecuenciaCardiaca },
    { key: 'frecuenciaRespiratoria', ref: frecuenciaRespiratoria, seDesconoce: seDesconoceFrecuenciaRespiratoria },
    { key: 'temperatura', ref: temperatura, seDesconoce: seDesconoceTemperatura },
    { key: 'saturacionOxigeno', ref: saturacionOxigeno, seDesconoce: seDesconoceSaturacionOxigeno },
  ];
  for (const { key, ref: r, seDesconoce } of fields) {
    const { seDesconoce: unk, display } = resolveInitial(key, getValFromSource(key));
    seDesconoce.value = unk;
    r.value = display;
  }
  if (seDesconoceSistolica.value || seDesconoceDiastolica.value) {
    seDesconoceSistolica.value = true;
    seDesconoceDiastolica.value = true;
    tensionArterialSistolica.value = null;
    tensionArterialDiastolica.value = null;
  }
  syncFormData();
});

onUnmounted(() => {
  finalizeEmptyAsUnknown();
  syncFormData();
});

/** Evita bucles al forzar pareja TA 0/0. */
let syncingTaPareja = false;

function endSyncingTaPareja() {
  nextTick(() => {
    syncingTaPareja = false;
  });
}

/** CEX: si una presión es desconocida, ambas deben serlo. */
function forzarTaDesconocida() {
  if (syncingTaPareja) return;
  syncingTaPareja = true;
  seDesconoceSistolica.value = true;
  seDesconoceDiastolica.value = true;
  tensionArterialSistolica.value = null;
  tensionArterialDiastolica.value = null;
  syncFormData();
  endSyncingTaPareja();
}

function limpiarTaParaCaptura() {
  if (syncingTaPareja) return;
  syncingTaPareja = true;
  seDesconoceSistolica.value = false;
  seDesconoceDiastolica.value = false;
  tensionArterialSistolica.value = null;
  tensionArterialDiastolica.value = null;
  syncFormData();
  endSyncingTaPareja();
}

watch(seDesconoceSistolica, (v) => {
  if (syncingTaPareja) return;
  if (v) forzarTaDesconocida();
  else limpiarTaParaCaptura();
});
watch(seDesconoceDiastolica, (v) => {
  if (syncingTaPareja) return;
  if (v) forzarTaDesconocida();
  else limpiarTaParaCaptura();
});

// Si el usuario escribe 0 en un campo, el otro pasa a desconocido de inmediato
watch(tensionArterialSistolica, (v) => {
  if (syncingTaPareja || seDesconoceSistolica.value) return;
  if (v === 0) forzarTaDesconocida();
});
watch(tensionArterialDiastolica, (v) => {
  if (syncingTaPareja || seDesconoceDiastolica.value) return;
  if (v === 0) forzarTaDesconocida();
});

watch(seDesconoceFrecuenciaCardiaca, (v) => {
  if (v) frecuenciaCardiaca.value = null;
});
watch(seDesconoceFrecuenciaRespiratoria, (v) => {
  if (v) frecuenciaRespiratoria.value = null;
});
watch(seDesconoceTemperatura, (v) => {
  if (v) temperatura.value = null;
});
watch(seDesconoceSaturacionOxigeno, (v) => {
  if (v) saturacionOxigeno.value = null;
});

watch(
  [
    seDesconoceSistolica,
    seDesconoceDiastolica,
    tensionArterialSistolica,
    tensionArterialDiastolica,
  ],
  syncFormData,
);
watch(
  [
    seDesconoceFrecuenciaCardiaca,
    seDesconoceFrecuenciaRespiratoria,
    frecuenciaCardiaca,
    frecuenciaRespiratoria,
  ],
  syncFormData,
);
watch(
  [seDesconoceTemperatura, seDesconoceSaturacionOxigeno, temperatura, saturacionOxigeno],
  syncFormData,
);

const mensajeErrorTensionSistolica = computed(() => {
  if (seDesconoceSistolica.value) return '';
  const rangeErr = mensajeErrorCexField(
    'tensionArterialSistolica',
    tensionArterialSistolica.value,
  );
  if (rangeErr) return rangeErr;
  const s = Number(tensionArterialSistolica.value);
  const d = Number(tensionArterialDiastolica.value);
  if (s > 0 && d > 0 && s < d) return NOTA_MEDICA_CEX_MESSAGES.taRelacion;
  return '';
});

const mensajeErrorTensionDiastolica = computed(() =>
  mensajeErrorCexField(
    'tensionArterialDiastolica',
    tensionArterialDiastolica.value,
    seDesconoceDiastolica.value,
  ),
);

const mensajeErrorFrecuenciaCardiaca = computed(() =>
  mensajeErrorCexField(
    'frecuenciaCardiaca',
    frecuenciaCardiaca.value,
    seDesconoceFrecuenciaCardiaca.value,
  ),
);

const mensajeErrorFrecuenciaRespiratoria = computed(() =>
  mensajeErrorCexField(
    'frecuenciaRespiratoria',
    frecuenciaRespiratoria.value,
    seDesconoceFrecuenciaRespiratoria.value,
  ),
);

const mensajeErrorTempertura = computed(() =>
  mensajeErrorCexField('temperatura', temperatura.value, seDesconoceTemperatura.value),
);

const mensajeErrorSaturacionOxigeno = computed(() =>
  mensajeErrorCexField(
    'saturacionOxigeno',
    saturacionOxigeno.value,
    seDesconoceSaturacionOxigeno.value,
  ),
);

const ranges = NOTA_MEDICA_CEX_RANGES;
</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Signos Vitales
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

    <h2 :class="variant === 'compact' ? 'text-sm font-semibold text-gray-800 mb-2' : ''">Tensión Arterial</h2>
    <div class="flex gap-4 mb-4 flex-wrap">
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="tensionArterialSistolica">Sistólica (mmHg) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="tensionArterialSistolica"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="tensionArterialSistolica ?? ''"
            @input="tensionArterialSistolica = parseOptionalNumber($event.target.value)"
            :min="ranges.tensionArterialSistolica.min"
            :max="ranges.tensionArterialSistolica.max"
            step="1"
            placeholder="50-300"
            :disabled="seDesconoceSistolica"
          >
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconoceSistolica" class="rounded">
            Se desconoce
          </label>
        </div>
        <p v-if="mensajeErrorTensionSistolica" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorTensionSistolica }}
        </p>
      </div>
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="tensionArterialDiastolica">Diastólica (mmHg)<span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="tensionArterialDiastolica"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="tensionArterialDiastolica ?? ''"
            @input="tensionArterialDiastolica = parseOptionalNumber($event.target.value)"
            :min="ranges.tensionArterialDiastolica.min"
            :max="ranges.tensionArterialDiastolica.max"
            step="1"
            placeholder="20-200"
            :disabled="seDesconoceDiastolica"
          >
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconoceDiastolica" class="rounded">
            Se desconoce
          </label>
        </div>
        <p v-if="mensajeErrorTensionDiastolica" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorTensionDiastolica }}
        </p>
      </div>
    </div>

    <div class="flex gap-4 mb-4 flex-wrap">
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="frecuenciaCardiaca">F. Cardíaca (lpm) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="frecuenciaCardiaca"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="frecuenciaCardiaca ?? ''"
            @input="frecuenciaCardiaca = parseOptionalNumber($event.target.value)"
            :min="ranges.frecuenciaCardiaca.min"
            :max="ranges.frecuenciaCardiaca.max"
            step="1"
            placeholder="40-220"
            :disabled="seDesconoceFrecuenciaCardiaca"
          >
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconoceFrecuenciaCardiaca" class="rounded">
            Se desconoce
          </label>
        </div>
        <p v-if="mensajeErrorFrecuenciaCardiaca" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorFrecuenciaCardiaca }}
        </p>
      </div>
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="frecuenciaRespiratoria">F. Resp. (rpm) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="frecuenciaRespiratoria"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="frecuenciaRespiratoria ?? ''"
            @input="frecuenciaRespiratoria = parseOptionalNumber($event.target.value)"
            :min="ranges.frecuenciaRespiratoria.min"
            :max="ranges.frecuenciaRespiratoria.max"
            step="1"
            placeholder="10-99"
            :disabled="seDesconoceFrecuenciaRespiratoria"
          >
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconoceFrecuenciaRespiratoria" class="rounded">
            Se desconoce
          </label>
        </div>
        <p v-if="mensajeErrorFrecuenciaRespiratoria" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorFrecuenciaRespiratoria }}
        </p>
      </div>
    </div>

    <div class="flex gap-4 mb-4 flex-wrap">
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="temperatura">Temperatura (°C) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="temperatura"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="temperatura ?? ''"
            @input="temperatura = parseOptionalNumber($event.target.value)"
            step="0.1"
            :min="ranges.temperatura.min"
            :max="ranges.temperatura.max"
            placeholder="30-44"
            :disabled="seDesconoceTemperatura"
          >
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconoceTemperatura" class="rounded">
            Se desconoce
          </label>
        </div>
        <p v-if="mensajeErrorTempertura" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorTempertura }}
        </p>
      </div>
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="saturacionOxigeno">Sat. Oxígeno (%) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="saturacionOxigeno"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="saturacionOxigeno ?? ''"
            @input="saturacionOxigeno = parseOptionalNumber($event.target.value)"
            :min="ranges.saturacionOxigeno.min"
            :max="ranges.saturacionOxigeno.max"
            step="1"
            placeholder="1-100"
            :disabled="seDesconoceSaturacionOxigeno"
          >
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconoceSaturacionOxigeno" class="rounded">
            Se desconoce
          </label>
        </div>
        <p v-if="mensajeErrorSaturacionOxigeno" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorSaturacionOxigeno }}
        </p>
      </div>
    </div>

  </div>
</template>
