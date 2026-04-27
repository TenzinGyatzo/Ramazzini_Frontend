<script setup>
import { watch, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  ORIENTACION_SIN_HALLAZGO,
  ORIENTACION_SIN_HALLAZGO_LEGACY,
} from '@/helpers/conclusionEntrevistaPsicologica';

/** Debe coincidir con los valores permitidos en `orientacionOpciones` (entrevista-psicologica.schema.ts) */
const opcionesOrientacion = [
  ORIENTACION_SIN_HALLAZGO,
  'Desorientación parcial',
  'Desorientación global',
];

const DEFAULT_ORIENTACION = ORIENTACION_SIN_HALLAZGO;

function normalizarOrientacion(valor) {
  if (valor === ORIENTACION_SIN_HALLAZGO_LEGACY) return ORIENTACION_SIN_HALLAZGO;
  return valor;
}

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

function obtenerOrientacionInicial() {
  const desdeForm = formDataEntrevistaPsicologica.orientacion;
  if (typeof desdeForm === 'string') {
    if (opcionesOrientacion.includes(desdeForm) || desdeForm === ORIENTACION_SIN_HALLAZGO_LEGACY) {
      return normalizarOrientacion(desdeForm);
    }
  }
  const desdeDoc = documentos.currentDocument?.orientacion;
  if (typeof desdeDoc === 'string') {
    if (opcionesOrientacion.includes(desdeDoc) || desdeDoc === ORIENTACION_SIN_HALLAZGO_LEGACY) {
      return normalizarOrientacion(desdeDoc);
    }
  }
  return DEFAULT_ORIENTACION;
}

const orientacion = ref(obtenerOrientacionInicial());

watch(orientacion, (newValue) => {
  formDataEntrevistaPsicologica.orientacion = newValue;
}, { immediate: true });
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Cognición</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">ORIENTACIÓN</h2>

    <div class="mb-8">
      <p class="text-sm font-medium mb-4 text-gray-800">Seleccione la opción que describe la orientación observada</p>

      <div class="grid grid-cols-1 gap-3">
        <label
          v-for="opcion in opcionesOrientacion"
          :key="opcion"
          :class="[
            'relative flex items-center justify-center min-h-[3.25rem] py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out text-center',
            orientacion === opcion
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="opcion"
            v-model="orientacion"
            class="sr-only"
          />
          <span
            :class="[
              'text-base transition-colors duration-200',
              orientacion === opcion ? 'text-emerald-700 font-semibold' : 'text-gray-700',
            ]"
          >
            {{ opcion }}
          </span>
          <div
            v-if="orientacion === opcion"
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
        Orientación:
        <span class="italic text-gray-600">Capacidad para identificar tiempo, lugar y persona de forma coherente con la realidad.</span>
      </p>
      <ul class="list-disc list-inside text-xs font-medium mb-4 text-gray-800 space-y-1">
        <li>
          Orientación en tiempo, espacio y persona:
          <span class="italic text-gray-600">Reconoce fecha, lugar y personas sin inconsistencias relevantes.</span>
        </li>
        <li>
          Desorientación parcial:
          <span class="italic text-gray-600">Errores en uno o dos dominios (p. ej. tiempo o contexto), con corrección parcial.</span>
        </li>
        <li>
          Desorientación global:
          <span class="italic text-gray-600">Alteración marcada en tiempo, espacio y/o persona.</span>
        </li>
      </ul>
    </div>
  </div>
</template>
