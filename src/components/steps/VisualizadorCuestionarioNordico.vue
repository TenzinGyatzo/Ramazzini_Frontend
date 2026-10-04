<script setup>
import { computed, ref } from 'vue';
import { useVisualizadorScrollPaso } from '@/composables/useVisualizadorScrollPaso';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { formatDateDDMMYYYY } from '@/helpers/dates';
import { useEdadAntiguedadDocumento } from '@/composables/useEdadAntiguedadDocumento';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  PASO_OBSERVACIONES_NORDICO,
  REGIONES_NORDICO,
  SEMAFORO_NORDICO,
  SI,
  bandaIntensidadNordico,
  calcularResultadoCuestionarioNordico,
  listaRegionesNordico,
  nivelesRegionNordico,
  textoAntiguedadActividadNordico,
  textoRelacionTrabajoNordico,
} from '@/helpers/cuestionarioNordico';
import GuiaCorporalNordico from './cuestionarioNordicoSteps/GuiaCorporalNordico.vue';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad } = useEdadAntiguedadDocumento(() => formData.formDataCuestionarioNordico.fechaCuestionarioNordico);
const stepsStore = useStepsStore();
const scrollRoot = ref(null);
useVisualizadorScrollPaso(scrollRoot, () => stepsStore.currentStep);

const fd = computed(() => formData.formDataCuestionarioNordico);

/** Vista previa con la misma regla del servidor; el resultado que se guarda lo calcula el backend. */
const resultado = computed(() => calcularResultadoCuestionarioNordico(fd.value?.regiones));
const semaforo = computed(() => SEMAFORO_NORDICO[resultado.value.semaforo]);
const niveles = computed(() => nivelesRegionNordico(resultado.value));

const regionesDelPasoActual = computed(() =>
  REGIONES_NORDICO.filter((region) => region.paso === stepsStore.currentStep).map((region) => region.clave),
);

const respuestasDe = (clave) => fd.value?.regiones?.[clave] ?? {};

/** Texto de una celda de detalle: valor si hay molestia, «—» si contestó «No», vacío si falta responder. */
const detalle = (clave, campo) => {
  const region = respuestasDe(clave);
  if (region.molestia12Meses === SI) return region[campo] ?? '';
  return region.molestia12Meses ? '—' : '';
};

const intensidadDe = (clave) => {
  const region = respuestasDe(clave);
  if (region.molestia12Meses !== SI) return region.molestia12Meses ? '—' : '';
  return region.intensidad != null ? `${region.intensidad}/10` : '';
};

const relacionDe = (clave) => {
  const region = respuestasDe(clave);
  if (region.molestia12Meses !== SI) return region.molestia12Meses ? '—' : '';
  return textoRelacionTrabajoNordico(region);
};

const claseFila = (clave) => {
  if (niveles.value[clave] === 'prioritaria') return 'bg-red-50';
  if (niveles.value[clave] === 'molestia') return 'bg-amber-50';
  return 'odd:bg-white even:bg-gray-50';
};

const irASiExiste = (stepNumber) => {
  if (stepNumber >= 1 && stepNumber <= stepsStore.steps.length) {
    stepsStore.goToStep(stepNumber);
  }
};

const irARegion = (clave) => {
  const region = REGIONES_NORDICO.find((r) => r.clave === clave);
  if (region) irASiExiste(region.paso);
};

const resaltePaso = (paso) =>
  stepsStore.currentStep === paso ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : '';
</script>

<template>
  <div
    ref="scrollRoot"
    class="visualizador-nordico flex flex-col gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
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
        data-paso="1"
        :class="resaltePaso(1)"
        @click="irASiExiste(1)"
      >
        <p class="w-full md:w-auto">
          Fecha: <span class="font-medium">{{ formatDateDDMMYYYY(fd.fechaCuestionarioNordico) }}</span>
        </p>
      </div>
    </div>

    <!-- Trabajador y datos de la actividad -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">NOMBRE</td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">EDAD</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">{{ edad }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">PUESTO</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.puesto }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">SEXO</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.sexo }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="irASiExiste(1)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ANTIGÜEDAD EN LA ACTIVIDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ textoAntiguedadActividadNordico(fd.antiguedadActividadAnios, fd.antiguedadActividadMeses) }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">HORAS POR SEMANA</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ fd.horasTrabajoSemana ?? 'No registradas' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="irASiExiste(1)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">MANO DOMINANTE</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium" colspan="3">
              {{ fd.manoDominante || 'No registrada' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <h3 class="text-base font-semibold text-gray-900">Cuestionario Nórdico de Kuorinka</h3>
      <p class="text-xs italic text-gray-500">
        Cuestionario estandarizado de percepción de síntomas musculoesqueléticos
      </p>
    </div>

    <!-- Guía corporal y resultado -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="w-32 sm:w-36 shrink-0 mx-auto sm:mx-0">
        <GuiaCorporalNordico
          :niveles="niveles"
          :regiones-activas="regionesDelPasoActual"
          interactiva
          @seleccionar="irARegion"
        />
      </div>

      <div class="min-w-0 flex-1 space-y-3">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
          <p class="text-sm font-semibold text-gray-900 mb-1">Resultado</p>
          <p class="flex items-center gap-2 text-lg sm:text-xl font-medium leading-snug" :class="semaforo.claseTexto">
            <span class="inline-block h-3 w-3 shrink-0 rounded-full" :class="semaforo.clasePunto"></span>
            {{ semaforo.titulo }}
          </p>
          <p class="text-xs text-gray-600 leading-snug mt-1">{{ semaforo.descripcion }}</p>
        </div>

        <table class="table-auto w-full border-collapse border border-gray-200 text-xs sm:text-sm">
          <tbody>
            <tr>
              <td class="px-2 py-1 border border-gray-300 text-gray-700">Regiones con molestia en 12 meses</td>
              <td class="px-2 py-1 border border-gray-300 font-medium">
                {{ resultado.regionesMolestia12Meses.length }} de {{ REGIONES_NORDICO.length }}
              </td>
            </tr>
            <tr>
              <td class="px-2 py-1 border border-gray-300 text-gray-700">Regiones con molestia en 7 días</td>
              <td class="px-2 py-1 border border-gray-300 font-medium">
                {{ resultado.regionesMolestia7Dias.length }}
              </td>
            </tr>
            <tr>
              <td class="px-2 py-1 border border-gray-300 text-gray-700">Intensidad máxima reportada</td>
              <td class="px-2 py-1 border border-gray-300 font-medium">
                {{ resultado.intensidadMaxima }}/10 ({{ bandaIntensidadNordico(resultado.intensidadMaxima) }})
              </td>
            </tr>
            <tr>
              <td class="px-2 py-1 border border-gray-300 text-gray-700">Puntuación (0 a 36)</td>
              <td class="px-2 py-1 border border-gray-300 font-medium">{{ resultado.puntuacionTotal }}</td>
            </tr>
            <tr>
              <td class="px-2 py-1 border border-gray-300 text-gray-700">Con impedimento para trabajar</td>
              <td class="px-2 py-1 border border-gray-300 font-medium">
                {{ listaRegionesNordico(resultado.regionesImpedimento) }}
              </td>
            </tr>
            <tr>
              <td class="px-2 py-1 border border-gray-300 text-gray-700">
                Relación laboral percibida por el trabajador
              </td>
              <td class="px-2 py-1 border border-gray-300 font-medium">
                {{ listaRegionesNordico(resultado.regionesRelacionLaboral) }}
              </td>
            </tr>
          </tbody>
        </table>

        <ul class="space-y-0.5 text-xs text-gray-600">
          <li class="flex items-center gap-2">
            <span class="inline-block h-3 w-3 shrink-0 rounded-full border border-slate-500 bg-white"></span>
            Sin molestia en 12 meses
          </li>
          <li class="flex items-center gap-2">
            <span class="inline-block h-3 w-3 shrink-0 rounded-full bg-amber-500"></span>
            Molestia en los últimos 12 meses
          </li>
          <li class="flex items-center gap-2">
            <span class="inline-block h-3 w-3 shrink-0 rounded-full bg-red-600"></span>
            Molestia en los últimos 7 días, impedimento para trabajar o intensidad de 7 o más
          </li>
        </ul>
      </div>
    </div>

    <!-- Detalle por región -->
    <!-- shrink-0: el contenedor es flex con alto máximo y, sin esto, la tabla se encoge hasta desaparecer -->
    <div class="overflow-x-auto -mx-1 sm:mx-0 shrink-0">
      <table class="table-auto w-full min-w-[640px] border-collapse border border-gray-200 text-xs">
        <thead>
          <tr class="bg-gray-100 text-gray-700">
            <th class="w-7 px-1 py-1.5 border border-gray-300 text-center font-semibold">#</th>
            <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold">Región</th>
            <th class="px-1 py-1.5 border border-gray-300 text-center font-semibold">12 meses</th>
            <th class="px-1 py-1.5 border border-gray-300 text-center font-semibold">Tiempo con molestia</th>
            <th class="px-1 py-1.5 border border-gray-300 text-center font-semibold">7 días</th>
            <th class="px-1 py-1.5 border border-gray-300 text-center font-semibold">Intens.</th>
            <th class="px-1 py-1.5 border border-gray-300 text-center font-semibold">Días con impedimento</th>
            <th class="px-1 py-1.5 border border-gray-300 text-center font-semibold">Atención profesional</th>
            <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold">
              Relación con el trabajo y actividades
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="region in REGIONES_NORDICO"
            :key="region.clave"
            class="cursor-pointer hover:bg-emerald-50/60 transition-colors"
            :class="[
              claseFila(region.clave),
              { 'ring-1 ring-inset ring-yellow-400': stepsStore.currentStep === region.paso },
            ]"
            :data-paso="region.paso"
            :data-region="region.clave"
            @click="irASiExiste(region.paso)"
          >
            <td class="px-1 py-1 border border-gray-300 text-center font-medium text-gray-600">
              {{ region.numero }}
            </td>
            <td class="px-2 py-1 border border-gray-300 font-medium text-gray-900">{{ region.etiqueta }}</td>
            <td
              class="px-1 py-1 border border-gray-300 text-center"
              :class="{ 'font-semibold': respuestasDe(region.clave).molestia12Meses === SI }"
            >
              {{ respuestasDe(region.clave).molestia12Meses ?? '' }}
            </td>
            <td class="px-1 py-1 border border-gray-300 text-center">
              {{ detalle(region.clave, 'tiempoMolestia12Meses') }}
            </td>
            <td class="px-1 py-1 border border-gray-300 text-center">{{ detalle(region.clave, 'molestia7Dias') }}</td>
            <td class="px-1 py-1 border border-gray-300 text-center">{{ intensidadDe(region.clave) }}</td>
            <td class="px-1 py-1 border border-gray-300 text-center">
              {{ detalle(region.clave, 'diasImpedimento') }}
            </td>
            <td class="px-1 py-1 border border-gray-300 text-center">
              {{ detalle(region.clave, 'atencionProfesional') }}
            </td>
            <td class="px-2 py-1 border border-gray-300">{{ relacionDe(region.clave) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Observaciones -->
    <div
      class="cursor-pointer text-sm text-gray-800"
      :data-paso="PASO_OBSERVACIONES_NORDICO"
      :class="resaltePaso(PASO_OBSERVACIONES_NORDICO)"
      @click="irASiExiste(PASO_OBSERVACIONES_NORDICO)"
    >
      <span class="font-semibold">Observaciones:</span>
      {{ fd.observaciones || 'Sin observaciones' }}
    </div>

    <p class="text-xs italic text-gray-600 leading-relaxed">
      Resultado de detección preliminar: no sustituye la valoración médica ni emite un diagnóstico.
    </p>
  </div>
</template>
