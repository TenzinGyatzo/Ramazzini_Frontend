<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `manejoEstresOpciones` en entrevista-psicologica.schema.ts */
const opcionesManejoEstres = ['Adecuado', 'Limitado', 'Inadecuado'];

const DEFAULT_MANEJO_ESTRES = 'Adecuado';

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerManejoEstresInicial() {
  const desdeForm = formDataEntrevistaPsicologica.manejoEstres;
  if (typeof desdeForm === 'string' && opcionesManejoEstres.includes(desdeForm)) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.manejoEstres;
  if (typeof desdeDoc === 'string' && opcionesManejoEstres.includes(desdeDoc)) {
    return desdeDoc;
  }
  return DEFAULT_MANEJO_ESTRES;
}

const manejoEstres = ref(obtenerManejoEstresInicial());

watch(manejoEstres, (newValue) => {
  formDataEntrevistaPsicologica.manejoEstres = newValue;
}, { immediate: true });
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Funcionamiento psicosocial</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">MANEJO DEL ESTRÉS</h2>

    <div class="mb-8">
      <p class="text-sm font-medium mb-4 text-gray-800">Seleccione la opción que describe el manejo del estrés observado o referido</p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label
          v-for="opcion in opcionesManejoEstres"
          :key="opcion"
          :class="[
            'relative flex items-center justify-center min-h-[3.25rem] py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out text-center',
            manejoEstres === opcion
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="opcion"
            v-model="manejoEstres"
            class="sr-only"
          />
          <span
            :class="[
              'text-base transition-colors duration-200',
              manejoEstres === opcion ? 'text-emerald-700 font-semibold' : 'text-gray-700',
            ]"
          >
            {{ opcion }}
          </span>
          <div
            v-if="manejoEstres === opcion"
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
        Manejo del estrés:
        <span class="italic text-gray-600">Estrategias para tolerar demandas laborales o personales y recuperar equilibrio.</span>
      </p>
      <ul class="list-disc list-inside text-xs font-medium mb-4 text-gray-800 space-y-1">
        <li>
          Adecuado:
          <span class="italic text-gray-600">Utiliza recursos y contención sin desbordes clínicos relevantes.</span>
        </li>
        <li>
          Limitado:
          <span class="italic text-gray-600">Afrontamiento parcial o con costo emocional/funcional.</span>
        </li>
        <li>
          Inadecuado:
          <span class="italic text-gray-600">Poca regulación, desbordamiento o respuestas poco adaptativas.</span>
        </li>
      </ul>
    </div>
  </div>
</template>
