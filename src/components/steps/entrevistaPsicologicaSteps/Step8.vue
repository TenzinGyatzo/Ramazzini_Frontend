<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `afectoOpciones` en entrevista-psicologica.schema.ts */
const opcionesAfecto = ['Adecuado', 'Plano', 'Lábil', 'Incongruente'];

const DEFAULT_AFECTO = 'Adecuado';

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerAfectoInicial() {
  const desdeForm = formDataEntrevistaPsicologica.afecto;
  if (typeof desdeForm === 'string' && opcionesAfecto.includes(desdeForm)) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.afecto;
  if (typeof desdeDoc === 'string' && opcionesAfecto.includes(desdeDoc)) {
    return desdeDoc;
  }
  return DEFAULT_AFECTO;
}

const afecto = ref(obtenerAfectoInicial());

watch(afecto, (newValue) => {
  formDataEntrevistaPsicologica.afecto = newValue;
}, { immediate: true });
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Afecto</h1>

    <div class="mb-8">
      <p class="text-sm font-medium mb-4 text-gray-800">Seleccione la opción que describe el afecto observado</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          v-for="opcion in opcionesAfecto"
          :key="opcion"
          :class="[
            'relative flex items-center justify-center min-h-[3.25rem] py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out text-center',
            afecto === opcion
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="opcion"
            v-model="afecto"
            class="sr-only"
          />
          <span
            :class="[
              'text-base transition-colors duration-200',
              afecto === opcion ? 'text-emerald-700 font-semibold' : 'text-gray-700',
            ]"
          >
            {{ opcion }}
          </span>
          <div
            v-if="afecto === opcion"
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
      <p class="text-sm font-medium mb-4 text-gray-800">Afecto: <span class="italic text-gray-600">Expresión observable de las emociones en el momento de la evaluación.</span></p>
      <ul class="list-disc list-inside text-xs font-medium mb-4 text-gray-800">
        <li>Adecuado: <span class="italic text-gray-600">Refleja emociones de manera coherente.</span></li>
        <li>Plano: <span class="italic text-gray-600">Muy poca o ninguna expresión emocional.</span></li>
        <li>Lábil: <span class="italic text-gray-600">Cambios emocionales rápidos e inestables.</span></li>
        <li>Incongruente: <span class="italic text-gray-600">La emoción no coincide con lo que dice.</span></li>
      </ul>
    </div>
  </div>
</template>
