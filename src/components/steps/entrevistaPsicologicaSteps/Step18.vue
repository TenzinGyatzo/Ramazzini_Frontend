<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `relacionesInterpersonalesOpciones` en entrevista-psicologica.schema.ts */
const opcionesRelacionesInterpersonales = [
  'Adecuadas',
  'Conflictos ocasionales',
  'Conflictos frecuentes',
  'Aislamiento',
];

const DEFAULT_RELACIONES = 'Adecuadas';

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerRelacionesInterpersonalesInicial() {
  const desdeForm = formDataEntrevistaPsicologica.relacionesInterpersonales;
  if (typeof desdeForm === 'string' && opcionesRelacionesInterpersonales.includes(desdeForm)) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.relacionesInterpersonales;
  if (typeof desdeDoc === 'string' && opcionesRelacionesInterpersonales.includes(desdeDoc)) {
    return desdeDoc;
  }
  return DEFAULT_RELACIONES;
}

const relacionesInterpersonales = ref(obtenerRelacionesInterpersonalesInicial());

watch(relacionesInterpersonales, (newValue) => {
  formDataEntrevistaPsicologica.relacionesInterpersonales = newValue;
}, { immediate: true });
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Funcionamiento psicosocial</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">RELACIONES INTERPERSONALES</h2>

    <div class="mb-8">
      <p class="text-sm font-medium mb-4 text-gray-800">Seleccione la opción que describe las relaciones interpersonales (autorreporte / impresión clínica)</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          v-for="opcion in opcionesRelacionesInterpersonales"
          :key="opcion"
          :class="[
            'relative flex items-center justify-center min-h-[3.25rem] py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out text-center',
            relacionesInterpersonales === opcion
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="opcion"
            v-model="relacionesInterpersonales"
            class="sr-only"
          />
          <span
            :class="[
              'text-base transition-colors duration-200',
              relacionesInterpersonales === opcion ? 'text-emerald-700 font-semibold' : 'text-gray-700',
            ]"
          >
            {{ opcion }}
          </span>
          <div
            v-if="relacionesInterpersonales === opcion"
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

    <div class="mb-8">
      <p class="text-sm font-medium mb-4 text-gray-800 text-justify">
        Relaciones interpersonales:
        <span class="italic text-gray-600">Calidad de la interacción con compañeros, jefes y familia según lo referido y lo observado en la entrevista.</span>
      </p>
      <ul class="list-disc list-inside text-xs font-medium mb-4 text-gray-800 space-y-1">
        <li>
          Adecuadas:
          <span class="italic text-gray-600">Interacción coherente, sin conflictos relevantes o con manejo adecuado.</span>
        </li>
        <li>
          Conflictos ocasionales:
          <span class="italic text-gray-600">Fricciones puntuales sin patrón sostenido.</span>
        </li>
        <li>
          Conflictos frecuentes:
          <span class="italic text-gray-600">Patrón repetido de tensiones o desacuerdos.</span>
        </li>
        <li>
          Aislamiento:
          <span class="italic text-gray-600">Retiro o distancia marcada en relaciones significativas.</span>
        </li>
      </ul>
    </div>
  </div>
</template>
