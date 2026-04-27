<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `atencionConcentracionOpciones` en entrevista-psicologica.schema.ts */
const opcionesAtencionConcentracion = ['Adecuada', 'Disminuida', 'Muy limitada'];

const DEFAULT_ATENCION = 'Adecuada';

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerAtencionConcentracionInicial() {
  const desdeForm = formDataEntrevistaPsicologica.atencionConcentracion;
  if (typeof desdeForm === 'string' && opcionesAtencionConcentracion.includes(desdeForm)) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.atencionConcentracion;
  if (typeof desdeDoc === 'string' && opcionesAtencionConcentracion.includes(desdeDoc)) {
    return desdeDoc;
  }
  return DEFAULT_ATENCION;
}

const atencionConcentracion = ref(obtenerAtencionConcentracionInicial());

watch(atencionConcentracion, (newValue) => {
  formDataEntrevistaPsicologica.atencionConcentracion = newValue;
}, { immediate: true });
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Cognición</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">ATENCIÓN Y CONCENTRACIÓN</h2>

    <div class="mb-8">
      <p class="text-sm font-medium mb-4 text-gray-800">Seleccione la opción que describe la atención y concentración observadas</p>

      <div class="grid grid-cols-1 gap-3">
        <label
          v-for="opcion in opcionesAtencionConcentracion"
          :key="opcion"
          :class="[
            'relative flex items-center justify-center min-h-[3.25rem] py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out text-center',
            atencionConcentracion === opcion
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="opcion"
            v-model="atencionConcentracion"
            class="sr-only"
          />
          <span
            :class="[
              'text-base transition-colors duration-200',
              atencionConcentracion === opcion ? 'text-emerald-700 font-semibold' : 'text-gray-700',
            ]"
          >
            {{ opcion }}
          </span>
          <div
            v-if="atencionConcentracion === opcion"
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
        Atención y concentración:
        <span class="italic text-gray-600">Capacidad para focalizar y sostener el foco en estímulos o tareas durante la entrevista.</span>
      </p>
      <ul class="list-disc list-inside text-xs font-medium mb-4 text-gray-800 space-y-1">
        <li>
          Adecuada:
          <span class="italic text-gray-600">Mantiene foco y seguimiento sin dificultad relevante.</span>
        </li>
        <li>
          Disminuida:
          <span class="italic text-gray-600">Distrae con facilidad o requiere reorientación ocasional.</span>
        </li>
        <li>
          Muy limitada:
          <span class="italic text-gray-600">Dificultad marcada para sostener atención o completar el hilo.</span>
        </li>
      </ul>
    </div>
  </div>
</template>
