<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `siNoOpciones` en trastorno-limite-personalidad.schema.ts */
const SI = 'Sí';
const NO = 'No';

const { formDataTrastornoLimitePersonalidad } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerInicial() {
  const desdeForm = formDataTrastornoLimitePersonalidad.autolesionIntentoSuicidio;
  if (desdeForm === SI || desdeForm === NO) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.autolesionIntentoSuicidio;
  if (desdeDoc === SI || desdeDoc === NO) {
    return desdeDoc;
  }
  return NO;
}

const autolesionIntentoSuicidio = ref(obtenerInicial());

watch(
  autolesionIntentoSuicidio,
  (nuevo) => {
    formDataTrastornoLimitePersonalidad.autolesionIntentoSuicidio = nuevo;
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Trastorno límite de la personalidad</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">AUTOLESIÓN E INTENTO DE SUICIDIO</h2>

    <div class="mb-8">
      <div class="space-y-3 mb-4 text-lg font-medium text-gray-800">
        <p>
          ¿Se ha lastimado físicamente de manera deliberada?
        </p>
        <div class="space-y-0.5 font-normal">
          <p class="text-sm">
            Por ejemplo:
          </p>
          <ul class="list-disc list-inside text-sm">
            <li>Se ha pegado un puñetazo</li>
            <li>Se ha cortado</li>
            <li>Se ha quemado</li>
          </ul>
        </div>
        <p>¿Ha tenido algún intento de suicidio?</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            autolesionIntentoSuicidio === NO
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="NO"
            v-model="autolesionIntentoSuicidio"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              autolesionIntentoSuicidio === NO ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              autolesionIntentoSuicidio === NO ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            No
          </span>
          <div
            v-if="autolesionIntentoSuicidio === NO"
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
            autolesionIntentoSuicidio === SI
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="SI"
            v-model="autolesionIntentoSuicidio"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              autolesionIntentoSuicidio === SI ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              autolesionIntentoSuicidio === SI ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            Sí
          </span>
          <div
            v-if="autolesionIntentoSuicidio === SI"
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
