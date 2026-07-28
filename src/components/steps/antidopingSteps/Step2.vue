<script setup>
import { reactive, watch, ref, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  ANTIDOPING_PARAMETROS_DEFAULTS,
  TIPOS_PRUEBA_OPCIONES,
  getCamposVisibles,
  formatoNombreParametro,
  inferTipoPruebaFromDoc,
  normalizeTipoPrueba,
} from '@/helpers/antidopingParametros';
import SiNoChips from './SiNoChips.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const formDataStore = useFormDataStore();
const documentos = useDocumentosStore();

const antidopingResult = ref('No');
const tipoPrueba = ref(
  normalizeTipoPrueba(formDataStore.formDataAntidoping.tipoPrueba),
);

const drugResults = reactive({ ...ANTIDOPING_PARAMETROS_DEFAULTS });

const camposVisibles = computed(() => getCamposVisibles(tipoPrueba.value));

/** Reemplaza el objeto del store para que Pinia/Vue propaguen el cambio al visualizador. */
function syncToStore() {
  const next = { ...formDataStore.formDataAntidoping };

  Object.keys(ANTIDOPING_PARAMETROS_DEFAULTS).forEach((campo) => {
    delete next[campo];
  });

  camposVisibles.value.forEach((campo) => {
    next[campo] = drugResults[campo];
  });

  next.tipoPrueba = tipoPrueba.value;
  formDataStore.formDataAntidoping = next;
}

onMounted(() => {
  const doc = documentos.currentDocument;

  if (doc) {
    for (const key of Object.keys(ANTIDOPING_PARAMETROS_DEFAULTS)) {
      if (key in doc) {
        drugResults[key] = doc[key];
      }
    }

    if (!formDataStore.formDataAntidoping.tipoPrueba) {
      tipoPrueba.value = inferTipoPruebaFromDoc(doc);
    } else {
      tipoPrueba.value = normalizeTipoPrueba(
        formDataStore.formDataAntidoping.tipoPrueba,
      );
    }

    antidopingResult.value = 'Si';
  } else {
    tipoPrueba.value = normalizeTipoPrueba(tipoPrueba.value || '5');
  }

  syncToStore();
});

onUnmounted(() => {
  syncToStore();
});

watch(
  () => ({ ...drugResults }),
  () => {
    syncToStore();
  },
  { deep: true },
);

watch(tipoPrueba, () => {
  syncToStore();
});

watch(antidopingResult, (val) => {
  if (val === 'No') {
    camposVisibles.value.forEach((campo) => {
      drugResults[campo] = 'Negativo';
    });
    syncToStore();
  }
});

function paramChipClass(parametro) {
  const positivo = drugResults[parametro] === 'Positivo';
  return [
    'antidoping-param-option flex flex-col items-stretch justify-center gap-0.5 cursor-pointer select-none rounded-md border px-2 py-1.5 text-left transition-colors duration-150',
    positivo
      ? 'border-rose-500 bg-rose-50 dark:border-rose-400 dark:bg-rose-950/55'
      : 'border-gray-300 bg-white hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500',
  ];
}

function toggleParametro(parametro) {
  if (antidopingResult.value !== 'Si') return;
  drugResults[parametro] =
    drugResults[parametro] === 'Positivo' ? 'Negativo' : 'Positivo';
  syncToStore();
}
</script>

<template>
  <div class="antidoping-step2">
    <h1
      v-if="variant !== 'compact'"
      class="font-bold mb-4 text-gray-800 leading-5"
    >
      Prueba Antidoping
    </h1>

    <div :class="variant === 'compact' ? 'mb-3' : 'mb-4'">
      <label class="block text-sm font-semibold text-gray-800 mb-1.5">
        Parámetros probados
      </label>
      <select
        v-model="tipoPrueba"
        class="w-full sm:w-auto min-w-[12rem] border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
      >
        <option
          v-for="opt in TIPOS_PRUEBA_OPCIONES"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </div>

    <SiNoChips
      v-model="antidopingResult"
      label="Resultados positivos"
      question="¿Hubo resultados positivos?"
      borderless
    />

    <div v-if="antidopingResult === 'Si'" class="mt-2">
      <p class="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-2">
        Marque las sustancias con resultado positivo
      </p>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          v-for="parametro in camposVisibles"
          :key="parametro"
          type="button"
          :class="paramChipClass(parametro)"
          :aria-pressed="drugResults[parametro] === 'Positivo'"
          @click="toggleParametro(parametro)"
        >
          <span
            class="font-semibold leading-tight"
            :class="[
              drugResults[parametro] === 'Positivo'
                ? 'text-rose-800 dark:text-rose-200'
                : 'text-gray-700 dark:text-slate-200',
              parametro === 'metilendioximetanfetamina'
                ? 'text-xs lg:text-[0.625rem]'
                : 'text-sm',
            ]"
          >
            {{ formatoNombreParametro(parametro) }}
          </span>
          <span
            class="text-[11px] font-medium leading-none"
            :class="
              drugResults[parametro] === 'Positivo'
                ? 'text-rose-600 dark:text-rose-300'
                : 'text-gray-400 dark:text-slate-400'
            "
          >
            {{ drugResults[parametro] === 'Positivo' ? 'Positivo' : 'Negativo' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style>
/* Negativo: hint verde al hover. Positivo: no pisar el borde rosa. */
html.dark-mode .antidoping-step2 .antidoping-param-option:not(.border-rose-500):hover {
  border-color: #34d399 !important;
}

/* Marca positiva: contraste legible sobre panel oscuro (bg-rose-50 no se remapea solo). */
html.dark-mode .antidoping-step2 .antidoping-param-option.border-rose-500 {
  background-color: rgba(136, 19, 55, 0.45) !important;
  border-color: #fb7185 !important;
}

html.dark-mode .antidoping-step2 .antidoping-param-option.border-rose-500:hover {
  border-color: #fda4af !important;
  background-color: rgba(159, 18, 57, 0.55) !important;
}
</style>
