<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { OPCIONES_NIVEL_PROBLEMA_P3, esOpcionNivelProblemaP3 } from '@/helpers/trastornosEstadoAnimoSteps';

const { formDataTrastornosEstadoAnimo } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerInicial() {
  const desdeForm = formDataTrastornosEstadoAnimo.p3NivelProblemaCausado;
  if (esOpcionNivelProblemaP3(desdeForm)) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.p3NivelProblemaCausado;
  if (esOpcionNivelProblemaP3(desdeDoc)) {
    return desdeDoc;
  }
  return OPCIONES_NIVEL_PROBLEMA_P3[0];
}

const p3NivelProblemaCausado = ref(obtenerInicial());

watch(
  p3NivelProblemaCausado,
  (nuevo) => {
    formDataTrastornosEstadoAnimo.p3NivelProblemaCausado = nuevo;
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Trastornos del estado de ánimo</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">PREGUNTA 3 (MDQ)</h2>

    <div class="mb-6 text-gray-800">
      <p class="text-lg font-medium leading-snug">
        ¿Cuánto problema le causaron algunas de estas situaciones —como por ejemplo, problemas en el trabajo, problemas familiares, financieros o legales, peleas físicas o verbales?
      </p>
    </div>

    <div class="mb-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          v-for="op in OPCIONES_NIVEL_PROBLEMA_P3"
          :key="op"
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out min-h-[5.5rem]',
            p3NivelProblemaCausado === op
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="op"
            v-model="p3NivelProblemaCausado"
            class="sr-only"
          />
          <span
            :class="[
              'text-sm sm:text-base font-semibold text-center leading-snug transition-colors duration-200',
              p3NivelProblemaCausado === op ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            {{ op }}
          </span>
          <div
            v-if="p3NivelProblemaCausado === op"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>
