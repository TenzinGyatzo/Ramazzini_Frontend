<script setup>
import { ref, watch, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { calcularEdad } from '@/helpers/dates';

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
const trabajadores = useTrabajadoresStore();

const relacionTemporalEmbarazo = ref(-1);
const trimestreGestacional = ref(-1);

function getValFromSource(field, defaultVal) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined && formVal !== null) return formVal;
  if (docVal !== undefined && docVal !== null) return docVal;
  return defaultVal;
}

function syncFormData() {
  formDataNotaMedica.relacionTemporalEmbarazo = relacionTemporalEmbarazo.value;
  if (relacionTemporalEmbarazo.value === -1) {
    trimestreGestacional.value = -1;
  }
  formDataNotaMedica.trimestreGestacional = trimestreGestacional.value;
}

function aplicarNoAplicaPorEdad() {
  relacionTemporalEmbarazo.value = -1;
  trimestreGestacional.value = -1;
  syncFormData();
}

const edadTrabajadora = computed(() => {
  const fechaNac = trabajadores.currentTrabajador?.fechaNacimiento;
  if (!fechaNac) return null;
  return calcularEdad(fechaNac);
});

const edadFueraDeRango = computed(() => {
  const edad = edadTrabajadora.value;
  if (edad == null) return false;
  return edad < 9 || edad > 59;
});

const muestraTrimestre = computed(
  () => !edadFueraDeRango.value && relacionTemporalEmbarazo.value !== -1,
);

const trimestreIncompleto = computed(
  () =>
    !edadFueraDeRango.value &&
    muestraTrimestre.value &&
    ![1, 2, 3].includes(trimestreGestacional.value),
);

function claseOpcionRelacion(valor) {
  const seleccionado = relacionTemporalEmbarazo.value === valor;
  if (edadFueraDeRango.value) {
    return seleccionado
      ? 'border-emerald-600 bg-emerald-50 cursor-not-allowed opacity-90 dark:bg-emerald-950/50 dark:border-emerald-500'
      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500';
  }
  return seleccionado
    ? 'border-emerald-600 bg-emerald-50 shadow-md cursor-pointer dark:bg-emerald-950/50 dark:border-emerald-500'
    : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30';
}

onMounted(() => {
  if (edadFueraDeRango.value) {
    aplicarNoAplicaPorEdad();
    return;
  }
  relacionTemporalEmbarazo.value = getValFromSource('relacionTemporalEmbarazo', -1);
  trimestreGestacional.value = getValFromSource('trimestreGestacional', -1);
  syncFormData();
});

watch(relacionTemporalEmbarazo, () => {
  if (edadFueraDeRango.value) return;
  if (relacionTemporalEmbarazo.value === -1) {
    trimestreGestacional.value = -1;
  }
  syncFormData();
});

watch(trimestreGestacional, () => {
  if (edadFueraDeRango.value) return;
  syncFormData();
});

watch(edadFueraDeRango, (fuera) => {
  if (fuera) aplicarNoAplicaPorEdad();
});

onUnmounted(syncFormData);
</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Embarazo
    </h2>
    <p
      v-if="variant !== 'compact'"
      class="text-sm text-gray-600 mb-4"
    >
      Registre la relación temporal del embarazo y el trimestre gestacional cuando aplique.
    </p>

    <p
      v-if="edadFueraDeRango"
      class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4"
    >
      La edad de la trabajadora está fuera del rango 9–59 años. Se registrará como "No aplica".
    </p>

    <div class="mb-6">
      <label class="block text-base font-medium text-gray-800 mb-3">
        Relación temporal embarazo
      </label>
      <fieldset :disabled="edadFueraDeRango" class="border-0 p-0 m-0 min-w-0">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label
            :class="[
              'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 transition-all duration-200 whitespace-nowrap',
              claseOpcionRelacion(-1),
            ]"
          >
            <input type="radio" :value="-1" v-model="relacionTemporalEmbarazo" class="sr-only" />
            <span
              :class="[
                'text-sm whitespace-nowrap',
                relacionTemporalEmbarazo === -1 ? 'text-emerald-700 font-semibold' : 'text-gray-700',
              ]"
            >
              No aplica
            </span>
          </label>

          <label
            :class="[
              'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 transition-all duration-200 whitespace-nowrap',
              claseOpcionRelacion(0),
            ]"
          >
            <input type="radio" :value="0" v-model="relacionTemporalEmbarazo" class="sr-only" />
            <span
              :class="[
                'text-sm whitespace-nowrap',
                relacionTemporalEmbarazo === 0 ? 'text-emerald-700 font-semibold' : 'text-gray-700',
              ]"
            >
              Primera vez
            </span>
          </label>

          <label
            :class="[
              'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 transition-all duration-200 whitespace-nowrap',
              claseOpcionRelacion(1),
            ]"
          >
            <input type="radio" :value="1" v-model="relacionTemporalEmbarazo" class="sr-only" />
            <span
              :class="[
                'text-sm whitespace-nowrap',
                relacionTemporalEmbarazo === 1 ? 'text-emerald-700 font-semibold' : 'text-gray-700',
              ]"
            >
              Subsecuente
            </span>
          </label>
        </div>
      </fieldset>
    </div>

    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="muestraTrimestre" class="mb-4">
        <label class="block text-base font-medium text-gray-800 mb-3">
          Trimestre gestacional <span class="text-red-500">*</span>
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label
            v-for="opcion in [
              { value: 1, label: 'Primero' },
              { value: 2, label: 'Segundo' },
              { value: 3, label: 'Tercero' },
            ]"
            :key="opcion.value"
            :class="[
              'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
              trimestreGestacional === opcion.value
                ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30',
            ]"
          >
            <input
              type="radio"
              :value="opcion.value"
              v-model="trimestreGestacional"
              class="sr-only"
            />
            <span
              :class="[
                'text-sm',
                trimestreGestacional === opcion.value
                  ? 'text-emerald-700 font-semibold'
                  : 'text-gray-700',
              ]"
            >
              {{ opcion.label }}
            </span>
          </label>
        </div>
        <p v-if="trimestreIncompleto" class="text-red-500 text-sm mt-2">
          Seleccione el trimestre gestacional.
        </p>
      </div>
    </transition>
  </div>
</template>
