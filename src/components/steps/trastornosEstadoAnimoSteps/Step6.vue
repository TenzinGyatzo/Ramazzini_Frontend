<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `siNoOpciones` en trastornos-estado-animo.schema.ts */
const SI = 'Sí';
const NO = 'No';

const { formDataTrastornosEstadoAnimo } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerInicial() {
  const desdeForm = formDataTrastornosEstadoAnimo.p1HablabaMasOMasRapido;
  if (desdeForm === SI || desdeForm === NO) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.p1HablabaMasOMasRapido;
  if (desdeDoc === SI || desdeDoc === NO) {
    return desdeDoc;
  }
  return NO;
}

const p1HablabaMasOMasRapido = ref(obtenerInicial());

watch(
  p1HablabaMasOMasRapido,
  (nuevo) => {
    formDataTrastornosEstadoAnimo.p1HablabaMasOMasRapido = nuevo;
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Trastornos del estado de ánimo</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">PREGUNTA 1 (MDQ)</h2>

    <div class="mb-6 space-y-4 text-gray-800">
      <p class="text-base font-medium leading-snug">
        ¿Ha pasado alguna vez por un período en el cual su personalidad o comportamiento no fueron los habituales y…
      </p>
      <p class="text-lg font-medium leading-snug">
        … hablaba más o más rápido que lo habitual?
      </p>
    </div>

    <div class="mb-8">
      <div class="grid grid-cols-2 gap-3">
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            p1HablabaMasOMasRapido === NO
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="NO"
            v-model="p1HablabaMasOMasRapido"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              p1HablabaMasOMasRapido === NO ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              p1HablabaMasOMasRapido === NO ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            No
          </span>
          <div
            v-if="p1HablabaMasOMasRapido === NO"
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
            p1HablabaMasOMasRapido === SI
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="SI"
            v-model="p1HablabaMasOMasRapido"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              p1HablabaMasOMasRapido === SI ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              p1HablabaMasOMasRapido === SI ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            Sí
          </span>
          <div
            v-if="p1HablabaMasOMasRapido === SI"
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
