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

const fd = computed(() => formData.formDataEntrevistaPsicologica);

const goToStep = (stepNumber) => {
  stepsStore.goToStep(stepNumber);
};

/** Solo navegar si el paso existe en el flujo actual (evita errores en consola). */
const irASiExiste = (stepNumber) => {
  if (stepNumber >= 1 && stepNumber <= stepsStore.steps.length) {
    goToStep(stepNumber);
  }
};

const valor = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '');

const tieneTexto = (v) => v !== undefined && v !== null && String(v).trim() !== '';
</script>

<template>
  <div
    class="flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

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
          Fecha: <span class="font-medium">{{ formatDateDDMMYYYY(fd.fechaEntrevistaPsicologica) }}</span>
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

    <!-- Secciones en dos columnas (md+), como VisualizadorExploracionFisica -->
    <!-- I + II -->
    <div class="w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        I. Observación general (conductual)
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-[55%] text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-semibold">Hallazgo</th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 2 }"
            @click="irASiExiste(2)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Apariencia</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.apariencia) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 3 }"
            @click="irASiExiste(3)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Actitud hacia el evaluador</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.actitudHaciaEvaluador) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 4 }"
            @click="irASiExiste(4)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Nivel de cooperación</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.nivelCooperacion) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 5 }"
            @click="irASiExiste(5)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Contacto visual</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.contactoVisual) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 6 }"
            @click="irASiExiste(6)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Conducta motora</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.conductaMotora) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        II. Estado de ánimo y afecto
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-[55%] text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-semibold">Hallazgo</th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 7 }"
            @click="irASiExiste(7)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Estado de ánimo predominante</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.estadoAnimoPredominante) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 8 }"
            @click="irASiExiste(8)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Afecto</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.afecto) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 9 }"
            @click="irASiExiste(9)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Intensidad emocional</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.intensidadEmocional) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- III + IV -->
    <div class="w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        III. Pensamiento
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-[55%] text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-semibold">Hallazgo</th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 10 }"
            @click="irASiExiste(10)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Curso del pensamiento</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.cursoPensamiento) }}
            </td>
          </tr>
        </tbody>
        <tbody
          class="cursor-pointer"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 11 }"
          @click="irASiExiste(11)"
        >
          <tr class="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Alteraciones del pensamiento</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">
              {{ valor(fd.alteracionesPensamiento) }}
            </td>
          </tr>
          <tr
            v-if="tieneTexto(fd.descripcionAlteracionesPensamiento)"
            class="odd:bg-white even:bg-gray-50 hover:bg-gray-100"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium align-top">
              Descripción (alteraciones del pensamiento)
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center whitespace-pre-wrap">
              {{ fd.descripcionAlteracionesPensamiento }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        IV. Percepción
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-[55%] text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-semibold">Hallazgo</th>
          </tr>
        </thead>
        <tbody
          class="cursor-pointer"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 12 }"
          @click="irASiExiste(12)"
        >
          <tr class="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Alteraciones perceptuales</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.alteracionesPerceptuales) }}
            </td>
          </tr>
          <tr
            v-if="tieneTexto(fd.descripcionAlteracionesPerceptuales)"
            class="odd:bg-white even:bg-gray-50 hover:bg-gray-100"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium align-top">
              Descripción (alteraciones perceptuales)
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center whitespace-pre-wrap">
              {{ fd.descripcionAlteracionesPerceptuales }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- V + VI -->
    <div class="w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        V. Cognición
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-[55%] text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-semibold">Hallazgo</th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 13 }"
            @click="irASiExiste(13)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Orientación</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.orientacion) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 14 }"
            @click="irASiExiste(14)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Atención y concentración</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.atencionConcentracion) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 15 }"
            @click="irASiExiste(15)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Memoria</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.memoria) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        VI. Juicio y conciencia de estado
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-[55%] text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-semibold">Hallazgo</th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 16 }"
            @click="irASiExiste(16)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Juicio</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.juicio) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 17 }"
            @click="irASiExiste(17)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Conciencia de estado</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.concienciaEstado) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- VII + VIII -->
    <div class="w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        VII. Funcionamiento psicosocial
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-[55%] text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-semibold">Hallazgo</th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 18 }"
            @click="irASiExiste(18)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Relaciones interpersonales</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.relacionesInterpersonales) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 19 }"
            @click="irASiExiste(19)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Desempeño laboral (autorreporte)</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.desempenoLaboralAutorreporte) }}
            </td>
          </tr>
          <tr
            class="odd:bg-white even:bg-gray-50 cursor-pointer hover:bg-gray-100"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 20 }"
            @click="irASiExiste(20)"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Manejo del estrés</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ valor(fd.manejoEstres) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        VIII. Riesgo inmediato (crítico)
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-[55%] text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-semibold">Hallazgo</th>
          </tr>
        </thead>
        <tbody
          class="cursor-pointer"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 21 }"
          @click="irASiExiste(21)"
        >
          <tr class="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">Ideación suicida</td>
            <td
              class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium"
              :class="fd.ideacionSuicida === 'Sí' ? 'text-red-600' : ''"
            >
              {{ valor(fd.ideacionSuicida) }}
            </td>
          </tr>
          <tr
            v-if="tieneTexto(fd.observacionesIdeacionSuicida)"
            class="odd:bg-white even:bg-gray-50 hover:bg-gray-100"
          >
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium align-top">
              Observaciones (ideación suicida)
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center whitespace-pre-wrap">
              {{ fd.observacionesIdeacionSuicida }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- IX. Conclusión clínica (ancho completo) -->
    <div class="w-full">
      <h2 class="text-lg font-medium mb-1 text-center text-gray-800">
        IX. Conclusión clínica
      </h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody
          class="cursor-pointer"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': stepsStore.currentStep === 22 }"
          @click="irASiExiste(22)"
        >
          <tr class="bg-gray-200">
            <td class="w-full text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium text-center">
              Conclusión clínica
            </td>
          </tr>
          <tr class="bg-white hover:bg-gray-50">
            <td class="text-sm sm:text-base px-2 py-2 border border-gray-300 text-center whitespace-pre-wrap min-h-[3rem]">
              {{ valor(fd.conclusionClinica) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
