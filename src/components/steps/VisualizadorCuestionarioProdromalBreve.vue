<script setup>
import { computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { formatDateDDMMYYYY } from '@/helpers/dates';
import { useEdadAntiguedadDocumento } from '@/composables/useEdadAntiguedadDocumento';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  TEXTO_CONSECUENCIA_PQ_B,
  PREGUNTAS_TEXTO_PQ_B,
  pasoFormularioPreguntaPQB,
  claveSi,
  claveGrado,
  contarFrecuenciaPQB,
  sumarMalestarPQB,
  textoInterpretacionPQB,
  esPositivoRiesgoPsicoticoPQB,
  puntosMalestarPorGrado,
  REGLA_SISTEMA_PUNTUACION_PQ_B,
} from '@/helpers/cuestionarioProdromalBreveSteps';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad, antiguedad } = useEdadAntiguedadDocumento(() => formData.formDataCuestionarioProdromalBreve.fechaCuestionarioProdromalBreve);
const stepsStore = useStepsStore();

const fd = computed(() => formData.formDataCuestionarioProdromalBreve);

const goToStep = (stepNumber) => {
  stepsStore.goToStep(stepNumber);
};

const irASiExiste = (stepNumber) => {
  if (stepNumber >= 1 && stepNumber <= stepsStore.steps.length) {
    goToStep(stepNumber);
  }
};

const valorRespuestaSiNo = (key) => {
  const v = fd.value?.[key];
  return v === 'Sí' || v === 'No' ? v : null;
};

const itemsPqB = PREGUNTAS_TEXTO_PQ_B.map((label, idx) => ({
  step: pasoFormularioPreguntaPQB(idx),
  keySi: claveSi(idx),
  keyGrado: claveGrado(idx),
  label,
}));

const frecuenciaPQB = computed(() => contarFrecuenciaPQB(fd.value));
const malestarPQB = computed(() => sumarMalestarPQB(fd.value));

const textoInterpretacionResultado = computed(() =>
  textoInterpretacionPQB(frecuenciaPQB.value, malestarPQB.value),
);

/** Mismo criterio que MDQ: naranja si positivo, verde si negativo (trastornos-estado-animo). */
const indicacionPositivaPQB = computed(() =>
  esPositivoRiesgoPsicoticoPQB(frecuenciaPQB.value, malestarPQB.value),
);

function textoMalestarFila(keyGrado) {
  const g = fd.value?.[keyGrado];
  if (typeof g !== 'string' || !g.trim()) return null;
  const pts = puntosMalestarPorGrado(g);
  if (pts === null) return g;
  return `${g} (${pts})`;
}
</script>

<template>
  <div
    class="visualizador-cuestionario-prodromal-breve flex flex-col gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
  >
    <!-- Empresa y Fecha (paso 1) -->
    <div class="flex flex-wrap w-full gap-1 md:gap-4">
      <div class="w-full md:w-[calc(75%-0.5rem)]">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <div
        class="w-full md:w-[calc(25%-0.5rem)] flex flex-wrap gap-2 justify-end text-sm sm:text-base cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 1 }"
        @click="irASiExiste(1)"
      >
        <p class="w-full md:w-auto">
          Fecha: <span class="font-medium">{{ formatDateDDMMYYYY(fd.fechaCuestionarioProdromalBreve) }}</span>
        </p>
      </div>
    </div>

    <!-- Trabajador -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NOMBRE
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              EDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ edad }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PUESTO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.puesto }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              SEXO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.sexo }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cuestionario PQ-B -->
    <div class="w-full space-y-3">
      <div class="text-center sm:text-left">
        <h3 class="text-base font-semibold text-gray-900">Cuestionario PQ-B</h3>
        <p class="text-xs italic text-gray-500">Prodromal Questionnaire — Brief</p>
      </div>

      <div class="rounded border border-gray-200 bg-white overflow-hidden">
        <p class="text-xs sm:text-sm text-gray-700 px-2 py-2 border-b border-gray-200 bg-gray-50 leading-snug">
          {{ TEXTO_CONSECUENCIA_PQ_B }}
        </p>

        <div class="overflow-x-auto -mx-0">
          <table class="table-auto w-full min-w-[320px] border-collapse border-0 text-xs sm:text-sm">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-200">
                <th class="w-8 px-1 py-2 text-center font-semibold text-gray-700">#</th>
                <th class="px-2 py-2 text-left font-semibold text-gray-700">Pregunta</th>
                <th class="w-11 px-1 py-2 text-center font-semibold text-gray-700">No</th>
                <th class="w-11 px-1 py-2 text-center font-semibold text-gray-700">Sí</th>
                <th class="min-w-[7rem] px-2 py-2 text-left font-semibold text-gray-700">Malestar</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in itemsPqB"
                :key="item.keySi"
                class="odd:bg-white even:bg-gray-50 cursor-pointer border-b border-gray-200"
                :class="{ 'ring-1 ring-inset ring-yellow-400': stepsStore.currentStep === item.step }"
                @click="irASiExiste(item.step)"
              >
                <td class="px-1 py-1.5 text-center font-medium text-gray-600 align-top">
                  {{ idx + 1 }}
                </td>
                <td class="px-2 py-1.5 text-gray-800 text-justify align-top leading-snug">
                  {{ item.label }}
                </td>
                <td class="px-0 py-1 align-middle border-l border-gray-200">
                  <div
                    class="mx-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
                  >
                    <span
                      v-if="valorRespuestaSiNo(item.keySi) === 'No'"
                      class="text-base sm:text-lg font-bold text-gray-900"
                      >X</span
                    >
                  </div>
                </td>
                <td class="px-0 py-1 align-middle border-l border-gray-200">
                  <div
                    class="mx-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
                  >
                    <span
                      v-if="valorRespuestaSiNo(item.keySi) === 'Sí'"
                      class="text-base sm:text-lg font-bold text-gray-900"
                      >X</span
                    >
                  </div>
                </td>
                <td class="px-2 py-1.5 text-gray-800 align-top border-l border-gray-200 text-[11px] sm:text-xs leading-snug">
                  <span v-if="valorRespuestaSiNo(item.keySi) !== 'Sí'" class="text-gray-400">—</span>
                  <span v-else-if="textoMalestarFila(item.keyGrado)">{{ textoMalestarFila(item.keyGrado) }}</span>
                  <span v-else class="text-gray-500 italic">Sin dato</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Resumen e interpretación -->
    <div class="w-full space-y-3 border-t border-gray-200 pt-4">
      <p class="text-sm text-gray-800">
        <span class="font-semibold">Frecuencia (respuestas «Sí»):</span>
        {{ frecuenciaPQB }} / 21
      </p>
      <p class="text-sm text-gray-800">
        <span class="font-semibold">Malestar (suma de puntuaciones):</span>
        {{ malestarPQB }}
      </p>

      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
        <p class="text-sm font-semibold text-gray-900 mb-1">Interpretación</p>
        <p
          class="text-xl sm:text-2xl font-medium leading-relaxed"
          :class="indicacionPositivaPQB ? 'text-orange-600' : 'text-emerald-600'"
        >
          {{ textoInterpretacionResultado }}
        </p>
      </div>

      <div class="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3">
        <p class="text-sm font-semibold text-gray-900 mb-2">Sistema de puntuación</p>
        <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {{ REGLA_SISTEMA_PUNTUACION_PQ_B }}
        </p>
      </div>

      <p class="text-xs italic text-gray-600 leading-relaxed">
        Este cuestionario no sustituye el diagnóstico de un especialista.
      </p>
    </div>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.visualizador-cuestionario-prodromal-breve div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-cuestionario-prodromal-breve div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer,
.visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer > td,
.visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer > th,
.visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer > td,
.visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer:hover,
.visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer:hover > td,
.visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer:hover > th,
.visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer:hover,
.visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer:hover > td,
.visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}
</style>

<style>
html.dark-mode .visualizador-cuestionario-prodromal-breve div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-cuestionario-prodromal-breve tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-cuestionario-prodromal-breve thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}
</style>
