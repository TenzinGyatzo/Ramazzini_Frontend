<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `concienciaEstadoOpciones` en entrevista-psicologica.schema.ts */
const opcionesConcienciaEstado = ['Presente', 'Parcial', 'Ausente'];

const DEFAULT_CONCIENCIA_ESTADO = 'Presente';

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerConcienciaEstadoInicial() {
  const desdeForm = formDataEntrevistaPsicologica.concienciaEstado;
  if (typeof desdeForm === 'string' && opcionesConcienciaEstado.includes(desdeForm)) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.concienciaEstado;
  if (typeof desdeDoc === 'string' && opcionesConcienciaEstado.includes(desdeDoc)) {
    return desdeDoc;
  }
  return DEFAULT_CONCIENCIA_ESTADO;
}

const concienciaEstado = ref(obtenerConcienciaEstadoInicial());

watch(concienciaEstado, (newValue) => {
  formDataEntrevistaPsicologica.concienciaEstado = newValue;
}, { immediate: true });
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Juicio y conciencia de estado</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">CONCIENCIA DE ESTADO</h2>

    <div class="mb-8">
      <p class="text-sm font-medium mb-4 text-gray-800">Seleccione la opción que describe la conciencia de estado observada</p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label
          v-for="opcion in opcionesConcienciaEstado"
          :key="opcion"
          :class="[
            'relative flex items-center justify-center min-h-[3.25rem] py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out text-center',
            concienciaEstado === opcion
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="opcion"
            v-model="concienciaEstado"
            class="sr-only"
          />
          <span
            :class="[
              'text-base transition-colors duration-200',
              concienciaEstado === opcion ? 'text-emerald-700 font-semibold' : 'text-gray-700',
            ]"
          >
            {{ opcion }}
          </span>
          <div
            v-if="concienciaEstado === opcion"
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
        Conciencia de estado:
        <span class="italic text-gray-600">Grado en que la persona reconoce su condición clínica o situación actual durante la entrevista.</span>
      </p>
      <ul class="list-disc list-inside text-xs font-medium mb-4 text-gray-800 space-y-1">
        <li>
          Presente:
          <span class="italic text-gray-600">Reconoce de forma clara el motivo de consulta o su situación.</span>
        </li>
        <li>
          Parcial:
          <span class="italic text-gray-600">Reconocimiento incompleto, fluctuante o con negación parcial.</span>
        </li>
        <li>
          Ausente:
          <span class="italic text-gray-600">No reconoce o niega la condición de forma consistente.</span>
        </li>
      </ul>
    </div>
  </div>
</template>
