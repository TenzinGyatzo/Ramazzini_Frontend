<script setup>
import { computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { calcularEdad, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const stepsStore = useStepsStore();

const fd = computed(() => formData.formDataTrastornoLimitePersonalidad);

/** Orden y textos alineados con el informe PDF (MSI-BPD). */
const itemsCuestionario = [
  {
    step: 2,
    key: 'relacionesCercanasDiscusionesRupturas',
    label:
      '¿Alguna de sus relaciones más cercanas ha tenido problemas por muchas discusiones o rupturas repetidas?',
  },
  {
    step: 3,
    key: 'autolesionIntentoSuicidio',
    label:
      '¿Se ha lastimado físicamente de manera deliberada (por ejemplo: se ha pegado un puñetazo, se ha cortado, se ha quemado)? ¿Ha tenido algún intento de suicidio?',
  },
  {
    step: 4,
    key: 'impulsividadOtrosDosProblemas',
    label:
      '¿Ha tenido al menos otros dos problemas de impulsividad (por ejemplo: atracones de comida y gastar sin control, beber en exceso y arrebatos verbales)?',
  },
  {
    step: 5,
    key: 'extremadamenteMalHumor',
    label: '¿Ha estado extremadamente de mal humor?',
  },
  {
    step: 6,
    key: 'enojadoFrecuenteActuaEnojadoSarcastico',
    label:
      '¿Se ha sentido muy enojado la mayor parte del tiempo? ¿Actúa de manera enojada o sarcástica con frecuencia?',
  },
  {
    step: 7,
    key: 'desconfianzaOtrasPersonas',
    label: '¿Ha desconfiado a menudo de otras personas?',
  },
  {
    step: 8,
    key: 'sensacionIrrealidadEntornoIrreal',
    label:
      '¿Se ha sentido frecuentemente irreal o como si las cosas a su alrededor fueran irreales?',
  },
  {
    step: 9,
    key: 'vacioCronico',
    label: '¿Se ha sentido vacío de manera crónica?',
  },
  {
    step: 10,
    key: 'faltaIdentidadQuienEs',
    label:
      '¿Ha sentido a menudo que no tiene ni idea de quién es o que carece de identidad?',
  },
  {
    step: 11,
    key: 'esfuerzosEvitarAbandono',
    label:
      '¿Ha hecho esfuerzos desesperados para evitar sentirse abandonado o que le abandonen (por ejemplo: llamó repetidamente a alguien para asegurarse de que todavía le importaba, le rogó que no le dejara, se aferró a la persona físicamente)?',
  },
];

const goToStep = (stepNumber) => {
  stepsStore.goToStep(stepNumber);
};

const irASiExiste = (stepNumber) => {
  if (stepNumber >= 1 && stepNumber <= stepsStore.steps.length) {
    goToStep(stepNumber);
  }
};

const valorRespuesta = (key) => {
  const v = fd.value?.[key];
  return v === 'Sí' || v === 'No' ? v : null;
};

const puntajeTotal = computed(() => {
  const data = fd.value;
  if (!data || typeof data !== 'object') return 0;
  return itemsCuestionario.reduce((acc, { key }) => {
    return acc + (data[key] === 'Sí' ? 1 : 0);
  }, 0);
});

const textoInterpretacion = computed(() => {
  const p = puntajeTotal.value;
  if (p <= 4) return 'Síntomas improbables de TLP presentes.';
  if (p <= 6) return 'Posibles síntomas de TLP presentes.';
  return 'Probable presencia de síntomas de TLP.';
});

/** Mismos tamaños/colores de interpretación que MDQ: verde | ocre | rojo según tramo. */
const claseColorInterpretacionTlp = computed(() => {
  const p = puntajeTotal.value;
  if (p <= 4) return 'text-green-600';
  if (p <= 6) return 'text-yellow-600';
  return 'text-orange-600';
});
</script>

<template>
  <div
    class="visualizador-tlp flex flex-col gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
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
          Fecha: <span class="font-medium">{{ formatDateDDMMYYYY(fd.fechaTrastornoLimitePersonalidad) }}</span>
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
              {{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}
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

    <!-- Cuestionario MSI-BPD -->
    <div class="w-full space-y-2">
      <div class="text-center sm:text-left">
        <h3 class="text-base font-semibold text-gray-900">Cuestionario MSI-BPD</h3>
        <p class="text-xs italic text-gray-500">McLean Screening Instrument for Borderline Personality Disorder</p>
      </div>

      <div class="overflow-x-auto -mx-1 sm:mx-0">
        <table class="table-auto w-full min-w-[320px] border-collapse border border-gray-200 text-xs sm:text-sm">
          <thead>
            <tr class="bg-gray-100">
              <th class="w-8 px-1 py-2 border border-gray-300 text-center font-semibold text-gray-700">#</th>
              <th class="px-2 py-2 border border-gray-300 text-left font-semibold text-gray-700">Pregunta</th>
              <th class="w-11 px-1 py-2 border border-gray-300 text-center font-semibold text-gray-700">No</th>
              <th class="w-11 px-1 py-2 border border-gray-300 text-center font-semibold text-gray-700">Sí</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, idx) in itemsCuestionario"
              :key="item.key"
              class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-emerald-50/40 transition-colors"
              :class="{ 'ring-1 ring-inset ring-yellow-400': stepsStore.currentStep === item.step }"
              @click="irASiExiste(item.step)"
            >
              <td class="px-1 py-1.5 border border-gray-300 text-center font-medium text-gray-600 align-top">
                {{ idx + 1 }}
              </td>
              <td class="px-2 py-1.5 border border-gray-300 text-gray-800 text-justify align-top leading-snug">
                {{ item.label }}
              </td>
              <td class="px-0 py-1 border border-gray-300 align-middle">
                <div
                  class="mx-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
                >
                  <span v-if="valorRespuesta(item.key) === 'No'" class="text-base sm:text-lg font-bold text-gray-900"
                    >X</span
                  >
                </div>
              </td>
              <td class="px-0 py-1 border border-gray-300 align-middle">
                <div
                  class="mx-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded border border-gray-400 bg-white"
                >
                  <span
                    v-if="valorRespuesta(item.key) === 'Sí'"
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

    <!-- Puntuación e interpretación -->
    <div class="w-full space-y-3 border-t border-gray-200 pt-4">
      <p class="text-sm text-gray-800">
        <span class="font-semibold">Puntuación:</span>
        {{ puntajeTotal }} / 10
      </p>

      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
        <p class="text-sm font-semibold text-gray-900 mb-1">Interpretación</p>
        <p
          class="text-xl sm:text-2xl font-medium leading-relaxed"
          :class="claseColorInterpretacionTlp"
        >
          {{ textoInterpretacion }}
        </p>
      </div>

      <div class="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3">
        <p class="text-sm font-semibold text-gray-900 mb-2">Interpretación de la puntuación:</p>
        <ul class="list-disc pl-5 space-y-1 text-sm leading-relaxed">
          <li class="font-normal">
            De 0 a 4: <span class="text-green-600">Síntomas improbables de TLP presentes.</span>
          </li>
          <li class="font-normal">
            De 5 a 6: <span class="text-yellow-600">Posibles síntomas de TLP presentes.</span>
          </li>
          <li class="font-normal">
            De 7 a 10: <span class="text-orange-600">Probable presencia de síntomas de TLP.</span>
          </li>
        </ul>
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

.visualizador-tlp div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-tlp div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-tlp tbody tr.cursor-pointer,
.visualizador-tlp thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-tlp tbody tr.cursor-pointer > td,
.visualizador-tlp tbody tr.cursor-pointer > th,
.visualizador-tlp thead tr.cursor-pointer > td,
.visualizador-tlp thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-tlp tbody tr.cursor-pointer:hover,
.visualizador-tlp tbody tr.cursor-pointer:hover > td,
.visualizador-tlp tbody tr.cursor-pointer:hover > th,
.visualizador-tlp thead tr.cursor-pointer:hover,
.visualizador-tlp thead tr.cursor-pointer:hover > td,
.visualizador-tlp thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}
</style>

<style>
html.dark-mode .visualizador-tlp div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-tlp tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-tlp tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-tlp tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-tlp thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-tlp thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-tlp thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}
</style>
