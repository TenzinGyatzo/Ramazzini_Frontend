<script setup>
import { computed, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const SI = 'Sí';
const NO = 'No';

const GRADO_ACUERDO_OPCIONES = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Totalmente de acuerdo',
];

const TEXTO_CONSECUENCIA =
  'Cuando esto sucede, me siento asustado, preocupado o me causa problemas:';

const { formDataCuestionarioProdromalBreve } = useFormDataStore();

function esP21Valido(v) {
  return v === SI || v === NO;
}

const p21 = computed({
  get() {
    const v = formDataCuestionarioProdromalBreve.p21;
    return esP21Valido(v) ? v : NO;
  },
  set(nuevo) {
    formDataCuestionarioProdromalBreve.p21 = nuevo;
    if (nuevo !== SI) {
      formDataCuestionarioProdromalBreve.p21GradoAcuerdoStatement = undefined;
    }
  },
});

const p21GradoAcuerdoStatement = computed({
  get() {
    const v = formDataCuestionarioProdromalBreve.p21GradoAcuerdoStatement;
    return GRADO_ACUERDO_OPCIONES.includes(v) ? v : '';
  },
  set(nuevo) {
    if (formDataCuestionarioProdromalBreve.p21 !== SI) {
      formDataCuestionarioProdromalBreve.p21GradoAcuerdoStatement = undefined;
      return;
    }
    if (GRADO_ACUERDO_OPCIONES.includes(nuevo)) {
      formDataCuestionarioProdromalBreve.p21GradoAcuerdoStatement = nuevo;
    } else {
      formDataCuestionarioProdromalBreve.p21GradoAcuerdoStatement = undefined;
    }
  },
});

const mostrarGrado = computed(() => p21.value === SI);

function asegurarP21DefaultEnStore() {
  if (!esP21Valido(formDataCuestionarioProdromalBreve.p21)) {
    formDataCuestionarioProdromalBreve.p21 = NO;
  }
}

onMounted(asegurarP21DefaultEnStore);
asegurarP21DefaultEnStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Cuestionario Prodromal Breve</h1>
    <p class="text-sm text-gray-600 mb-6">Pregunta 21 de 21</p>

    <div class="mb-6">
      <p class="text-lg font-medium mb-4 text-gray-800 leading-snug">
        ¿A veces a la gente le cuesta entender lo que está diciendo?
      </p>

      <div class="grid grid-cols-2 gap-3 max-w-md">
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            p21 === NO
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input type="radio" :value="NO" v-model="p21" class="sr-only" />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              p21 === NO ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              p21 === NO ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            No
          </span>
          <div
            v-if="p21 === NO"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </label>

        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            p21 === SI
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input type="radio" :value="SI" v-model="p21" class="sr-only" />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              p21 === SI ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              p21 === SI ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            Sí
          </span>
          <div
            v-if="p21 === SI"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </label>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="mostrarGrado" class="mt-8 pt-6 border-t border-gray-200">
        <p class="text-sm font-semibold text-gray-700 mb-1">Si contestó Sí:</p>
        <p class="text-base text-gray-800 mb-4 leading-snug">{{ TEXTO_CONSECUENCIA }}</p>

        <div class="flex flex-col gap-2">
          <label
            v-for="opt in GRADO_ACUERDO_OPCIONES"
            :key="opt"
            :class="[
              'flex items-center gap-3 py-2.5 px-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
              p21GradoAcuerdoStatement === opt
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-emerald-300',
            ]"
          >
            <input
              type="radio"
              :value="opt"
              v-model="p21GradoAcuerdoStatement"
              class="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <span
              :class="[
                'text-sm leading-snug',
                p21GradoAcuerdoStatement === opt ? 'font-semibold text-emerald-800' : 'text-gray-700',
              ]"
            >
              {{ opt }}
            </span>
          </label>
        </div>
      </div>
    </Transition>
  </div>
</template>
