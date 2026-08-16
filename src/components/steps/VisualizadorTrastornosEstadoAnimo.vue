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
  OPCIONES_NIVEL_PROBLEMA_P3,
  contarSiMdqP1,
  cumpleCriterioTriajePositivoMdq,
  indicePasoP3Mdq,
  indicePasoP4Mdq,
  indicePasoP5Mdq,
  requierePaso15SituacionesMismoPeriodo,
} from '@/helpers/trastornosEstadoAnimoSteps';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad, antiguedad } = useEdadAntiguedadDocumento(() => formData.formDataTrastornosEstadoAnimo.fechaTrastornosEstadoAnimo);
const stepsStore = useStepsStore();

const fd = computed(() => formData.formDataTrastornosEstadoAnimo);

/** Textos P1 alineados con el informe PDF / pasos 2–14. */
const itemsP1Mdq = [
  {
    step: 2,
    key: 'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
    label:
      '… se sentía tan bien o tan exaltado que la gente pensó que su comportamiento no era el habitual, o estaba tan exaltado que se metió en problemas?',
  },
  {
    step: 3,
    key: 'p1IrritableGritosPeleas',
    label: '… estaba tan irritable que le gritó a la gente o inició peleas físicas o verbales?',
  },
  {
    step: 4,
    key: 'p1MasSeguridadQueLoHabitual',
    label: '… se sintió con mucha más seguridad en sí mismo que lo habitual?',
  },
  {
    step: 5,
    key: 'p1DormiaMenosSinNecesitarMasSueno',
    label:
      '… dormía mucho menos que lo habitual, y se dio cuenta de que, a pesar de ello, no necesitaba más horas de sueño?',
  },
  {
    step: 6,
    key: 'p1HablabaMasOMasRapido',
    label: '… hablaba más o más rápido que lo habitual?',
  },
  {
    step: 7,
    key: 'p1PensamientosAgolpados',
    label: '… sentía que los pensamientos se agolpaban en su cabeza, o que no podía detenerlos?',
  },
  {
    step: 8,
    key: 'p1DistraccionDificultadConcentracion',
    label:
      '… se distraía tan fácilmente con lo que sucedía a su alrededor que tenía dificultad para mantener la concentración?',
  },
  {
    step: 9,
    key: 'p1MasEnergiaQueLoHabitual',
    label: '… tenía mucha más energía que lo habitual?',
  },
  {
    step: 10,
    key: 'p1MasActivoOMasCosasQueLoHabitual',
    label: '… estaba mucho más activo o hacía muchas más cosas que lo habitual?',
  },
  {
    step: 11,
    key: 'p1MasSocialExtrovertido',
    label:
      '… estaba mucho más social o extrovertido que lo habitual —por ejemplo, llamaba a sus amigos por teléfono a altas horas de la noche?',
  },
  {
    step: 12,
    key: 'p1MasApetitoSexual',
    label: '… tenía mucho más apetito sexual que lo habitual?',
  },
  {
    step: 13,
    key: 'p1CosasExageradasRiesgosas',
    label:
      '… hacía cosas que no eran comunes en usted, o que a la gente le podrían haber parecido exageradas, tontas, o riesgosas?',
  },
  {
    step: 14,
    key: 'p1GastoDineroProblemas',
    label: '… gastó dinero que le causó problemas a usted o a su familia?',
  },
];

const textoP2 =
  'Si respondió “Sí” a dos o más de las preguntas anteriores, ¿algunas de las situaciones descritas ocurrieron durante el mismo período de tiempo?';

const textoP3 =
  '¿Cuánto problema le causaron algunas de estas situaciones —como por ejemplo, problemas en el trabajo, problemas familiares, financieros o legales, peleas físicas o verbales?';

const textoP4 =
  '¿Alguno de sus familiares directos (es decir, hijos, hermanos, padres, abuelos, tíos) padeció alguna vez de trastorno maníaco-depresivo o bipolar?';

const textoP5 =
  '¿Alguna vez algún profesional médico le ha dicho que usted padece de trastorno maníaco-depresivo o bipolar?';

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

const contarSiP1 = computed(() => contarSiMdqP1(fd.value));

const aplicaP2 = computed(() => requierePaso15SituacionesMismoPeriodo(fd.value));

const stepP2 = 15;
const stepP3 = computed(() => indicePasoP3Mdq(fd.value));
const stepP4 = computed(() => indicePasoP4Mdq(fd.value));
const stepP5 = computed(() => indicePasoP5Mdq(fd.value));

const valorP2 = computed(() => valorRespuestaSiNo('p2SituacionesMismoPeriodo'));
const valorP3 = computed(() => {
  const v = fd.value?.p3NivelProblemaCausado;
  return typeof v === 'string' && v.trim() !== '' ? v : null;
});

const indicacionPositivaTriaje = computed(() => cumpleCriterioTriajePositivoMdq(fd.value));

const textoInterpretacionResultado = computed(() => {
  if (indicacionPositivaTriaje.value) {
    return 'Positivo para riesgo de trastorno bipolar';
  }
  return 'Negativo para riesgo de trastorno bipolar';
});

const REGLA_TRIAJE_MDQ =
  'El responder «Sí» a 7 o más de los eventos de la pregunta Nº 1 y a la pregunta Nº 2, así como responder «Problemas moderados» o «Problemas serios» a la pregunta Nº 3 se considera una indicación positiva respecto al trastorno bipolar.';
</script>

<template>
  <div
    class="visualizador-trastornos-estado-animo flex flex-col gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
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
          Fecha: <span class="font-medium">{{ formatDateDDMMYYYY(fd.fechaTrastornosEstadoAnimo) }}</span>
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

    <!-- Cuestionario MDQ -->
    <div class="w-full space-y-3">
      <div class="text-center sm:text-left">
        <h3 class="text-base font-semibold text-gray-900">Cuestionario MDQ</h3>
        <p class="text-xs italic text-gray-500">Mood Disorder Questionnaire</p>
      </div>

      <!-- P1: lead-in + tabla ítems -->
      <div class="rounded border border-gray-200 bg-white overflow-hidden">
        <p class="text-xs sm:text-sm font-semibold text-gray-900 px-2 py-2 border-b border-gray-200 bg-gray-50">
          1.
        </p>
        <p class="text-xs sm:text-sm text-gray-800 px-2 py-2 border-b border-gray-200 leading-snug text-justify">
          ¿Ha pasado alguna vez por un período en el cual su personalidad o comportamiento no fueron los habituales y…
        </p>

        <div class="overflow-x-auto -mx-0">
          <table class="table-auto w-full min-w-[300px] border-collapse border-0 text-xs sm:text-sm">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-200">
                <th class="w-8 px-1 py-2 text-center font-semibold text-gray-700">#</th>
                <th class="px-2 py-2 text-left font-semibold text-gray-700">Pregunta</th>
                <th class="w-11 px-1 py-2 text-center font-semibold text-gray-700">No</th>
                <th class="w-11 px-1 py-2 text-center font-semibold text-gray-700">Sí</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in itemsP1Mdq"
                :key="item.key"
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
                      v-if="valorRespuestaSiNo(item.key) === 'No'"
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
                      v-if="valorRespuestaSiNo(item.key) === 'Sí'"
                      class="text-base sm:text-lg font-bold text-gray-900"
                      >X</span
                    >
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- P2 -->
      <div
        class="rounded border border-gray-200 overflow-hidden"
        :class="[
          aplicaP2 ? 'cursor-pointer' : 'bg-gray-50',
          { 'ring-1 ring-inset ring-yellow-400': aplicaP2 && stepsStore.currentStep === stepP2 },
        ]"
        @click="aplicaP2 ? irASiExiste(stepP2) : null"
      >
        <p class="text-xs sm:text-sm font-semibold text-gray-900 px-2 py-2 border-b border-gray-200 bg-gray-50">
          2.
        </p>
        <div v-if="aplicaP2" class="flex flex-col sm:flex-row sm:items-stretch border-b border-gray-200">
          <p class="flex-1 text-xs sm:text-sm text-gray-800 px-2 py-2 leading-snug text-justify">
            {{ textoP2 }}
          </p>
          <div class="flex shrink-0 border-t sm:border-t-0 sm:border-l border-gray-200">
            <div class="flex w-1/2 sm:w-14 flex-col items-center justify-center gap-1 py-2 border-r border-gray-200">
              <span class="text-[10px] sm:text-xs font-semibold text-gray-600">No</span>
              <div
                class="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
              >
                <span v-if="valorP2 === 'No'" class="text-base font-bold text-gray-900">X</span>
              </div>
            </div>
            <div class="flex w-1/2 sm:w-14 flex-col items-center justify-center gap-1 py-2">
              <span class="text-[10px] sm:text-xs font-semibold text-gray-600">Sí</span>
              <div
                class="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
              >
                <span v-if="valorP2 === 'Sí'" class="text-base font-bold text-gray-900">X</span>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-xs sm:text-sm text-gray-600 px-2 py-3 italic">
          No aplica: la pregunta 2 solo se formula si hubo al menos dos respuestas «Sí» en la pregunta 1.
        </p>
      </div>

      <!-- P3: opciones horizontales -->
      <div
        class="rounded border border-gray-200 overflow-hidden cursor-pointer"
        :class="{ 'ring-1 ring-inset ring-yellow-400': stepsStore.currentStep === stepP3 }"
        @click="irASiExiste(stepP3)"
      >
        <p class="text-xs sm:text-sm font-semibold text-gray-900 px-2 py-2 border-b border-gray-200 bg-gray-50">
          3.
        </p>
        <p class="text-xs sm:text-sm text-gray-800 px-2 py-2 border-b border-gray-200 leading-snug text-justify">
          {{ textoP3 }}
        </p>
        <div
          class="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2 py-3 bg-white"
        >
          <label
            v-for="op in OPCIONES_NIVEL_PROBLEMA_P3"
            :key="op"
            class="flex items-start gap-2 text-xs sm:text-sm text-gray-800 leading-snug"
          >
            <span
              class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-500 bg-white"
              aria-hidden="true"
            >
              <span v-if="valorP3 === op" class="h-2 w-2 rounded-full bg-gray-800" />
            </span>
            <span>{{ op }}</span>
          </label>
        </div>
      </div>

      <!-- P4 -->
      <div
        class="rounded border border-gray-200 overflow-hidden cursor-pointer"
        :class="{ 'ring-1 ring-inset ring-yellow-400': stepsStore.currentStep === stepP4 }"
        @click="irASiExiste(stepP4)"
      >
        <p class="text-xs sm:text-sm font-semibold text-gray-900 px-2 py-2 border-b border-gray-200 bg-gray-50">
          4.*
        </p>
        <div class="flex flex-col sm:flex-row sm:items-stretch">
          <p class="flex-1 text-xs sm:text-sm text-gray-800 px-2 py-2 leading-snug text-justify">
            {{ textoP4 }}
          </p>
          <div class="flex shrink-0 border-t sm:border-t-0 sm:border-l border-gray-200">
            <div class="flex w-1/2 sm:w-14 flex-col items-center justify-center gap-1 py-2 border-r border-gray-200">
              <span class="text-[10px] sm:text-xs font-semibold text-gray-600">No</span>
              <div
                class="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
              >
                <span v-if="valorRespuestaSiNo('p4FamiliarDirectoBipolar') === 'No'" class="text-base font-bold text-gray-900"
                  >X</span
                >
              </div>
            </div>
            <div class="flex w-1/2 sm:w-14 flex-col items-center justify-center gap-1 py-2">
              <span class="text-[10px] sm:text-xs font-semibold text-gray-600">Sí</span>
              <div
                class="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
              >
                <span v-if="valorRespuestaSiNo('p4FamiliarDirectoBipolar') === 'Sí'" class="text-base font-bold text-gray-900"
                  >X</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- P5 -->
      <div
        class="rounded border border-gray-200 overflow-hidden cursor-pointer"
        :class="{ 'ring-1 ring-inset ring-yellow-400': stepsStore.currentStep === stepP5 }"
        @click="irASiExiste(stepP5)"
      >
        <p class="text-xs sm:text-sm font-semibold text-gray-900 px-2 py-2 border-b border-gray-200 bg-gray-50">
          5.*
        </p>
        <div class="flex flex-col sm:flex-row sm:items-stretch">
          <p class="flex-1 text-xs sm:text-sm text-gray-800 px-2 py-2 leading-snug text-justify">
            {{ textoP5 }}
          </p>
          <div class="flex shrink-0 border-t sm:border-t-0 sm:border-l border-gray-200">
            <div class="flex w-1/2 sm:w-14 flex-col items-center justify-center gap-1 py-2 border-r border-gray-200">
              <span class="text-[10px] sm:text-xs font-semibold text-gray-600">No</span>
              <div
                class="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
              >
                <span v-if="valorRespuestaSiNo('p5DiagnosticoProfesionalBipolar') === 'No'" class="text-base font-bold text-gray-900"
                  >X</span
                >
              </div>
            </div>
            <div class="flex w-1/2 sm:w-14 flex-col items-center justify-center gap-1 py-2">
              <span class="text-[10px] sm:text-xs font-semibold text-gray-600">Sí</span>
              <div
                class="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
              >
                <span v-if="valorRespuestaSiNo('p5DiagnosticoProfesionalBipolar') === 'Sí'" class="text-base font-bold text-gray-900"
                  >X</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Resumen e interpretación -->
    <div class="w-full space-y-3 border-t border-gray-200 pt-4">
      <p class="text-sm text-gray-800">
        <span class="font-semibold">Respuestas «Sí» en la pregunta 1:</span>
        {{ contarSiP1 }} / 13
      </p>

      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
        <p class="text-sm font-semibold text-gray-900 mb-1">Interpretación</p>
        <p
          class="text-xl sm:text-2xl font-medium leading-relaxed"
          :class="indicacionPositivaTriaje ? 'text-orange-600' : 'text-emerald-600'"
        >
          {{ textoInterpretacionResultado }}
        </p>
      </div>

      <div class="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3">
        <p class="text-sm font-semibold text-gray-900 mb-2">Regla de evaluación de resultados (MDQ)</p>
        <p class="text-sm text-gray-700 leading-relaxed">
          {{ REGLA_TRIAJE_MDQ }}
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

.visualizador-trastornos-estado-animo div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-trastornos-estado-animo div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-trastornos-estado-animo tbody tr.cursor-pointer,
.visualizador-trastornos-estado-animo thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-trastornos-estado-animo tbody tr.cursor-pointer > td,
.visualizador-trastornos-estado-animo tbody tr.cursor-pointer > th,
.visualizador-trastornos-estado-animo thead tr.cursor-pointer > td,
.visualizador-trastornos-estado-animo thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-trastornos-estado-animo tbody tr.cursor-pointer:hover,
.visualizador-trastornos-estado-animo tbody tr.cursor-pointer:hover > td,
.visualizador-trastornos-estado-animo tbody tr.cursor-pointer:hover > th,
.visualizador-trastornos-estado-animo thead tr.cursor-pointer:hover,
.visualizador-trastornos-estado-animo thead tr.cursor-pointer:hover > td,
.visualizador-trastornos-estado-animo thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}
</style>

<style>
html.dark-mode .visualizador-trastornos-estado-animo div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-trastornos-estado-animo tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-trastornos-estado-animo tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-trastornos-estado-animo tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-trastornos-estado-animo thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-trastornos-estado-animo thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-trastornos-estado-animo thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}
</style>
