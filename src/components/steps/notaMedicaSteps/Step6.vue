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

const tensionArterialSistolica = ref(120);
const tensionArterialDiastolica = ref(80);
const frecuenciaCardiaca = ref(80);
const frecuenciaRespiratoria = ref(17);
const temperatura = ref(36.5);
const saturacionOxigeno = ref(97);

// CEX NOM-024: "Se desconoce" por campo (null en payload, 999 en CEX)
const seDesconoceSistolica = ref(false);
const seDesconoceDiastolica = ref(false);
const seDesconoceFrecuenciaCardiaca = ref(false);
const seDesconoceFrecuenciaRespiratoria = ref(false);
const seDesconoceTemperatura = ref(false);
const seDesconoceSaturacionOxigeno = ref(false);

function isDesconocido(val) {
  return val == null || val === 0;
}

function getValFromSource(field, defaults) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined) return formVal;
  if (docVal !== undefined) return docVal;
  if (documentos.currentDocument) return undefined; // documento sin campo = desconocido
  return defaults;
}

onMounted(() => {
  const fields = [
    { key: 'tensionArterialSistolica', ref: tensionArterialSistolica, seDesconoce: seDesconoceSistolica, default: 120 },
    { key: 'tensionArterialDiastolica', ref: tensionArterialDiastolica, seDesconoce: seDesconoceDiastolica, default: 80 },
    { key: 'frecuenciaCardiaca', ref: frecuenciaCardiaca, seDesconoce: seDesconoceFrecuenciaCardiaca, default: 80 },
    { key: 'frecuenciaRespiratoria', ref: frecuenciaRespiratoria, seDesconoce: seDesconoceFrecuenciaRespiratoria, default: 17 },
    { key: 'temperatura', ref: temperatura, seDesconoce: seDesconoceTemperatura, default: 36.5 },
    { key: 'saturacionOxigeno', ref: saturacionOxigeno, seDesconoce: seDesconoceSaturacionOxigeno, default: 97 },
  ];
  for (const { key, ref, seDesconoce, default: def } of fields) {
    const val = getValFromSource(key, def);
    const desconocido = val === undefined ? !!documentos.currentDocument : isDesconocido(val);
    seDesconoce.value = desconocido;
    ref.value = desconocido ? 0 : (val ?? def);
  }
  // TA: si uno es desconocido, ambos deben serlo (CEX)
  if (seDesconoceSistolica.value || seDesconoceDiastolica.value) {
    seDesconoceSistolica.value = true;
    seDesconoceDiastolica.value = true;
    tensionArterialSistolica.value = 0;
    tensionArterialDiastolica.value = 0;
  }
});

function syncFormData() {
  // CEX: "Se desconoce" → null (validador skipea; transformer mapea a 0 en GIIS)
  formDataNotaMedica.tensionArterialSistolica = seDesconoceSistolica.value ? null : tensionArterialSistolica.value;
  formDataNotaMedica.tensionArterialDiastolica = seDesconoceDiastolica.value ? null : tensionArterialDiastolica.value;
  formDataNotaMedica.frecuenciaCardiaca = seDesconoceFrecuenciaCardiaca.value ? null : frecuenciaCardiaca.value;
  formDataNotaMedica.frecuenciaRespiratoria = seDesconoceFrecuenciaRespiratoria.value ? null : frecuenciaRespiratoria.value;
  formDataNotaMedica.temperatura = seDesconoceTemperatura.value ? null : temperatura.value;
  formDataNotaMedica.saturacionOxigeno = seDesconoceSaturacionOxigeno.value ? null : saturacionOxigeno.value;
}

onUnmounted(() => {
  syncFormData();
});

// CEX: si diastolica=0, sistolica debe ser 0; si sistolica=0, diastolica debe ser 0
watch(seDesconoceSistolica, (v) => {
  if (v) {
    tensionArterialSistolica.value = 0;
    seDesconoceDiastolica.value = true;
    tensionArterialDiastolica.value = 0;
  } else {
    tensionArterialSistolica.value = 120;
    tensionArterialDiastolica.value = 80;
    seDesconoceDiastolica.value = false;
  }
});
watch(seDesconoceDiastolica, (v) => {
  if (v) {
    tensionArterialDiastolica.value = 0;
    if (!seDesconoceSistolica.value) {
      // CEX: si diastolica=0, sistolica debe ser 0
      seDesconoceSistolica.value = true;
      tensionArterialSistolica.value = 0;
    }
  } else {
    tensionArterialDiastolica.value = 80;
    tensionArterialSistolica.value = 120;
    seDesconoceSistolica.value = false;
  }
});

watch(seDesconoceFrecuenciaCardiaca, (v) => { if (v) frecuenciaCardiaca.value = 0; else frecuenciaCardiaca.value = 80; });
watch(seDesconoceFrecuenciaRespiratoria, (v) => { if (v) frecuenciaRespiratoria.value = 0; else frecuenciaRespiratoria.value = 17; });
watch(seDesconoceTemperatura, (v) => { if (v) temperatura.value = 0; else temperatura.value = 36.5; });
watch(seDesconoceSaturacionOxigeno, (v) => { if (v) saturacionOxigeno.value = 0; else saturacionOxigeno.value = 97; });

// Sincronizar formData reactivamente para que submit tenga datos correctos
watch([seDesconoceSistolica, seDesconoceDiastolica, tensionArterialSistolica, tensionArterialDiastolica], syncFormData, { deep: true });
watch([seDesconoceFrecuenciaCardiaca, seDesconoceFrecuenciaRespiratoria, frecuenciaCardiaca, frecuenciaRespiratoria], syncFormData, { deep: true });
watch([seDesconoceTemperatura, seDesconoceSaturacionOxigeno, temperatura, saturacionOxigeno], syncFormData, { deep: true });

// Rangos CEX NOM-024. Si valor=0 (desconoce), no mostrar error
const mensajeErrorTensionSistolica = computed(() => {
  if (tensionArterialSistolica.value === 0) return '';
  return tensionArterialSistolica.value < 50
    ? 'CEX: mínimo 50 mmHg'
    : tensionArterialSistolica.value > 300
      ? 'CEX: máximo 300 mmHg'
      : '';
});

const mensajeErrorTensionDiastolica = computed(() => {
  if (tensionArterialDiastolica.value === 0) return '';
  return tensionArterialDiastolica.value < 20
    ? 'CEX: mínimo 20 mmHg'
    : tensionArterialDiastolica.value > 200
      ? 'CEX: máximo 200 mmHg'
      : '';
});

const mensajeErrorFrecuenciaCardiaca = computed(() => {
  if (frecuenciaCardiaca.value === 0) return '';
  return frecuenciaCardiaca.value < 40
    ? 'CEX: mínimo 40 lpm'
    : frecuenciaCardiaca.value > 220
      ? 'CEX: máximo 220 lpm'
      : '';
});

const mensajeErrorFrecuenciaRespiratoria = computed(() => {
  if (frecuenciaRespiratoria.value === 0) return '';
  return frecuenciaRespiratoria.value < 10
    ? 'CEX: mínimo 10 rpm'
    : frecuenciaRespiratoria.value > 99
      ? 'CEX: máximo 99 rpm'
      : '';
});

const mensajeErrorTempertura = computed(() => {
  if (temperatura.value === 0) return '';
  return temperatura.value < 30
    ? 'CEX: mínimo 30 °C'
    : temperatura.value > 44
      ? 'CEX: máximo 44 °C'
      : '';
});

const mensajeErrorSaturacionOxigeno = computed(() => {
  if (saturacionOxigeno.value === 0) return '';
  return saturacionOxigeno.value < 1
    ? 'CEX: mínimo 1 %'
    : saturacionOxigeno.value > 100
      ? 'CEX: máximo 100 %'
      : '';
});
</script>

<template>
  <div>
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
          <input type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model="tensionArterialSistolica"
            :min="0"
            :max="300"
            :disabled="seDesconoceSistolica">
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
          <input type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model="tensionArterialDiastolica"
            :min="0"
            :max="200"
            :disabled="seDesconoceDiastolica">
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
          <input type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model="frecuenciaCardiaca"
            :min="0"
            :max="220"
            :disabled="seDesconoceFrecuenciaCardiaca">
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
          <input type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model="frecuenciaRespiratoria"
            :min="0"
            :max="99"
            :disabled="seDesconoceFrecuenciaRespiratoria">
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
          <input type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model="temperatura"
            step="0.1"
            :min="0"
            :max="44"
            :disabled="seDesconoceTemperatura">
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
          <input type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model="saturacionOxigeno"
            :min="0"
            :max="100"
            :disabled="seDesconoceSaturacionOxigeno">
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
