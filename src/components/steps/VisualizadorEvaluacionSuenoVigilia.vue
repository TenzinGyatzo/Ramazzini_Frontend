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
  ALERTAS_SUENO_VIGILIA,
  AREAS_SUENO_VIGILIA,
  CLASE_NIVEL_SUENO_VIGILIA,
  ETIQUETA_NIVEL_SUENO_VIGILIA,
  FRECUENCIAS_SUENO_VIGILIA,
  LEYENDA_SUENO_VIGILIA,
  PASO_CONTEXTO_SUENO_VIGILIA,
  PASO_AREA_SUENO_VIGILIA,
  PASO_SEGUIMIENTO_SUENO_VIGILIA,
  PASO_SEGURIDAD_SUENO_VIGILIA,
  PREGUNTAS_SEGURIDAD_SUENO_VIGILIA,
  PREGUNTAS_SUENO_VIGILIA,
  SI,
  TITULO_MODULO_SUENO_VIGILIA,
  TITULO_PRIORIDAD_SUENO_VIGILIA,
  calcularResultadoEvaluacionSuenoVigilia,
  haySintomasSuenoVigilia,
  textoFactoresSuenoVigilia,
  textoHorasSuenoVigilia,
  textoProductosSuenoVigilia,
  valorFrecuenciaSuenoVigilia,
} from '@/helpers/evaluacionSuenoVigilia';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad } = useEdadAntiguedadDocumento(
  () => formData.formDataEvaluacionSuenoVigilia.fechaEvaluacionSuenoVigilia,
);
const stepsStore = useStepsStore();
const scrollRoot = ref(null);
useVisualizadorScrollPaso(scrollRoot, () => stepsStore.currentStep);

const fd = computed(() => formData.formDataEvaluacionSuenoVigilia);

/** Vista previa con la misma regla del servidor; el resultado que se guarda lo calcula el backend. */
const resultado = computed(() => calcularResultadoEvaluacionSuenoVigilia(fd.value));
const alertas = computed(() =>
  ALERTAS_SUENO_VIGILIA.filter((alerta) => resultado.value.alertas.includes(alerta.clave)),
);

/** Módulos → áreas → preguntas, en el orden del cuestionario. */
const modulos = ['sueno', 'vigilia'].map((modulo) => ({
  modulo,
  areas: AREAS_SUENO_VIGILIA.filter((area) => area.modulo === modulo).map((area) => ({
    ...area,
    paso: PASO_AREA_SUENO_VIGILIA[area.clave],
    preguntas: PREGUNTAS_SUENO_VIGILIA.filter((pregunta) => pregunta.area === area.clave),
  })),
}));

const respuesta = (pregunta) => valorFrecuenciaSuenoVigilia(fd.value?.[pregunta.modulo]?.[pregunta.clave]);

const seguridad = computed(() => fd.value?.seguridad ?? {});
const seguimiento = computed(() => fd.value?.seguimiento ?? {});
const haySintomas = computed(() => haySintomasSuenoVigilia(fd.value));
const haySintomasVigilia = computed(() => haySintomasSuenoVigilia(fd.value, 'vigilia'));

const irASiExiste = (stepNumber) => {
  if (stepNumber >= 1 && stepNumber <= stepsStore.steps.length) {
    stepsStore.goToStep(stepNumber);
  }
};

const resaltePaso = (paso) =>
  stepsStore.currentStep === paso ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : '';

const clasePuntoAlerta = (alerta) =>
  alerta.nivel === 'informativo' ? 'bg-slate-500' : CLASE_NIVEL_SUENO_VIGILIA[alerta.nivel].punto;
</script>

<template>
  <div
    ref="scrollRoot"
    class="visualizador-sueno-vigilia flex flex-col gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
  >
    <!-- Empresa y Fecha (paso 1) -->
    <div class="flex flex-wrap w-full gap-1 md:gap-4 shrink-0">
      <div class="w-full md:w-[calc(75%-0.5rem)]">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <div
        class="w-full md:w-[calc(25%-0.5rem)] flex flex-wrap gap-2 justify-end text-sm sm:text-base cursor-pointer"
        :data-paso="PASO_CONTEXTO_SUENO_VIGILIA"
        :class="resaltePaso(PASO_CONTEXTO_SUENO_VIGILIA)"
        @click="irASiExiste(PASO_CONTEXTO_SUENO_VIGILIA)"
      >
        <p class="w-full md:w-auto">
          Fecha: <span class="font-medium">{{ formatDateDDMMYYYY(fd.fechaEvaluacionSuenoVigilia) }}</span>
        </p>
      </div>
    </div>

    <!-- Trabajador y contexto del sueño -->
    <div class="w-full shrink-0">
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
        </tbody>
        <!-- Contexto del sueño: se captura en el paso 1, junto con la fecha -->
        <tbody
          :class="{ 'contorno-paso': stepsStore.currentStep === PASO_CONTEXTO_SUENO_VIGILIA }"
          data-grupo="contexto"
        >
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="irASiExiste(PASO_CONTEXTO_SUENO_VIGILIA)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              HORAS DE SUEÑO POR CADA 24
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ textoHorasSuenoVigilia(fd.minutosSuenoDiarios) }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">HORARIO LABORAL</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ fd.horarioLaboral || 'No registrado' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="irASiExiste(PASO_CONTEXTO_SUENO_VIGILIA)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              CALIDAD GENERAL DEL SUEÑO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium" colspan="3">
              {{ fd.calidadGeneralSueno || 'No registrada' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="shrink-0">
      <h3 class="text-base font-semibold text-gray-900">Evaluación de sueño y vigilia</h3>
      <p class="text-xs italic text-gray-500">Periodo evaluado: último mes</p>
    </div>

    <!-- Prioridad de seguimiento y alertas -->
    <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 shrink-0" data-resultado>
      <p class="text-sm font-semibold text-gray-900 mb-1">Prioridad de seguimiento</p>
      <p
        class="flex flex-wrap items-center gap-2 text-lg sm:text-xl font-medium leading-snug"
        :class="CLASE_NIVEL_SUENO_VIGILIA[resultado.prioridad].texto"
      >
        <span
          class="inline-block h-3 w-3 shrink-0 rounded-full"
          :class="CLASE_NIVEL_SUENO_VIGILIA[resultado.prioridad].punto"
        ></span>
        {{ TITULO_PRIORIDAD_SUENO_VIGILIA[resultado.prioridad] }}
        <span v-if="!resultado.completo" class="text-xs font-normal text-gray-500">(evaluación incompleta)</span>
      </p>
      <ul v-if="alertas.length" class="mt-2 grid gap-x-4 gap-y-0.5 sm:grid-cols-2 text-xs sm:text-sm">
        <li v-for="alerta in alertas" :key="alerta.clave" class="flex items-start gap-2" :data-alerta="alerta.clave">
          <span class="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full" :class="clasePuntoAlerta(alerta)"></span>
          <span :class="alerta.nivel === 'informativo' ? 'text-gray-600' : 'font-medium text-gray-900'">
            {{ alerta.texto }}
          </span>
        </li>
      </ul>
    </div>

    <!-- Las 12 preguntas por módulo y área -->
    <!-- shrink-0: el contenedor es flex con alto máximo y, sin esto, la tabla se encoge hasta desaparecer -->
    <div class="overflow-x-auto -mx-1 sm:mx-0 shrink-0">
      <table class="table-auto w-full min-w-[560px] border-collapse border border-gray-200 text-xs">
        <thead>
          <tr class="bg-gray-100 text-gray-700">
            <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold">
              En el último mes, ¿con qué frecuencia…
            </th>
            <th
              v-for="opcion in FRECUENCIAS_SUENO_VIGILIA"
              :key="opcion"
              class="w-20 px-1 py-1.5 border border-gray-300 text-center font-semibold"
            >
              {{ opcion }}
            </th>
          </tr>
        </thead>
        <template v-for="grupo in modulos" :key="grupo.modulo">
          <tbody>
            <tr class="bg-gray-200">
              <td
                class="px-2 py-1 border border-gray-300 font-semibold uppercase text-gray-900"
                :colspan="1 + FRECUENCIAS_SUENO_VIGILIA.length"
              >
                {{ TITULO_MODULO_SUENO_VIGILIA[grupo.modulo] }}
              </td>
            </tr>
          </tbody>
          <!-- Cada área (su encabezado y sus preguntas) es un paso: un grupo de filas con contorno -->
          <tbody
            v-for="area in grupo.areas"
            :key="area.clave"
            :class="{ 'contorno-paso': stepsStore.currentStep === area.paso }"
            :data-paso="area.paso"
            :data-grupo-area="area.clave"
          >
            <tr
              class="cursor-pointer"
              :class="CLASE_NIVEL_SUENO_VIGILIA[resultado.areas[area.clave].nivel].fila"
              :data-area="area.clave"
              @click="irASiExiste(area.paso)"
            >
              <td class="px-2 py-1 border border-gray-300" :colspan="1 + FRECUENCIAS_SUENO_VIGILIA.length">
                <span class="font-semibold text-gray-900">{{ area.etiqueta }}:&nbsp;</span>
                <span class="font-semibold" :class="CLASE_NIVEL_SUENO_VIGILIA[resultado.areas[area.clave].nivel].texto">
                  {{ ETIQUETA_NIVEL_SUENO_VIGILIA[resultado.areas[area.clave].nivel] }}
                </span>
                <span class="ml-2 text-gray-500">
                  (suma {{ resultado.areas[area.clave].suma }} de {{ area.preguntas.length * 3 }})
                </span>
              </td>
            </tr>
            <tr
              v-for="pregunta in area.preguntas"
              :key="pregunta.clave"
              class="cursor-pointer bg-white hover:bg-emerald-50/60 transition-colors"
              :data-pregunta="pregunta.clave"
              @click="irASiExiste(area.paso)"
            >
              <td class="pl-4 pr-2 py-1 border border-gray-300 text-gray-800 leading-snug">{{ pregunta.texto }}</td>
              <td
                v-for="(opcion, valor) in FRECUENCIAS_SUENO_VIGILIA"
                :key="opcion"
                class="px-1 py-1 border border-gray-300 text-center font-bold text-gray-900"
              >
                {{ respuesta(pregunta) === valor ? 'X' : '' }}
              </td>
            </tr>
          </tbody>
        </template>
      </table>
    </div>

    <!-- Seguridad -->
    <div
      class="shrink-0 cursor-pointer"
      :data-paso="PASO_SEGURIDAD_SUENO_VIGILIA"
      :class="resaltePaso(PASO_SEGURIDAD_SUENO_VIGILIA)"
      @click="irASiExiste(PASO_SEGURIDAD_SUENO_VIGILIA)"
    >
      <table class="table-auto w-full border-collapse border border-gray-200 text-xs">
        <thead>
          <tr class="bg-gray-100 text-gray-700">
            <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold">Preguntas de seguridad</th>
            <th class="w-36 px-2 py-1.5 border border-gray-300 text-center font-semibold">Respuesta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pregunta in PREGUNTAS_SEGURIDAD_SUENO_VIGILIA" :key="pregunta.clave" :data-seguridad="pregunta.clave">
            <td class="px-2 py-1 border border-gray-300 text-gray-800 leading-snug">
              {{ pregunta.texto }}
              <span
                v-if="pregunta.campoDescripcion && seguridad[pregunta.clave] === SI && seguridad[pregunta.campoDescripcion]"
                class="block italic text-gray-600"
              >
                Descripción: {{ seguridad[pregunta.campoDescripcion] }}
              </span>
            </td>
            <td
              class="px-2 py-1 border border-gray-300 text-center"
              :class="
                !seguridad[pregunta.clave]
                  ? 'text-amber-700'
                  : seguridad[pregunta.clave] === SI
                    ? 'font-semibold text-gray-900'
                    : 'text-gray-800'
              "
            >
              {{ seguridad[pregunta.clave] || 'Sin respuesta' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Seguimiento y observaciones -->
    <div
      class="shrink-0 cursor-pointer space-y-2"
      :data-paso="PASO_SEGUIMIENTO_SUENO_VIGILIA"
      :class="resaltePaso(PASO_SEGUIMIENTO_SUENO_VIGILIA)"
      @click="irASiExiste(PASO_SEGUIMIENTO_SUENO_VIGILIA)"
    >
      <table v-if="haySintomas" class="table-auto w-full border-collapse border border-gray-200 text-xs" data-seguimiento>
        <thead>
          <tr class="bg-gray-100 text-gray-700">
            <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold" colspan="2">Seguimiento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="w-2/5 px-2 py-1 border border-gray-300 text-gray-700">¿Desde cuándo presenta estos síntomas?</td>
            <td class="px-2 py-1 border border-gray-300 font-medium">{{ seguimiento.duracion || 'Sin respuesta' }}</td>
          </tr>
          <tr v-if="haySintomasVigilia">
            <td class="px-2 py-1 border border-gray-300 text-gray-700">
              Los síntomas del día empeoran al dormir poco o mal
            </td>
            <td class="px-2 py-1 border border-gray-300 font-medium">
              {{ seguimiento.empeoraAlDormirMal || 'Sin respuesta' }}
            </td>
          </tr>
          <tr v-if="textoFactoresSuenoVigilia(seguimiento)">
            <td class="px-2 py-1 border border-gray-300 text-gray-700">Factores que influyen en los síntomas</td>
            <td class="px-2 py-1 border border-gray-300 font-medium">{{ textoFactoresSuenoVigilia(seguimiento) }}</td>
          </tr>
          <tr v-if="textoProductosSuenoVigilia(seguimiento)">
            <td class="px-2 py-1 border border-gray-300 text-gray-700">Uso de productos para dormir</td>
            <td class="px-2 py-1 border border-gray-300 font-medium">{{ textoProductosSuenoVigilia(seguimiento) }}</td>
          </tr>
        </tbody>
      </table>

      <p class="text-sm text-gray-800">
        <span class="font-semibold">Observaciones:</span>
        {{ fd.observaciones || 'Sin observaciones' }}
      </p>
    </div>

    <p class="text-xs italic text-gray-600 leading-relaxed shrink-0">
      El nivel de cada área corresponde a su síntoma más frecuente. {{ LEYENDA_SUENO_VIGILIA }}
    </p>
  </div>
</template>

<style scoped>
/*
 * Contorno del paso activo alrededor de un grupo de filas (un <tbody>).
 * Se dibuja con sombras interiores en las celdas porque el contorno y el anillo sobre
 * <tr> o <tbody> no se pintan de forma confiable en tablas con bordes colapsados.
 */
.contorno-paso > tr > td {
  --contorno-arriba: inset 0 0 0 0 transparent;
  --contorno-abajo: inset 0 0 0 0 transparent;
  --contorno-izquierda: inset 0 0 0 0 transparent;
  --contorno-derecha: inset 0 0 0 0 transparent;
  box-shadow: var(--contorno-arriba), var(--contorno-abajo), var(--contorno-izquierda), var(--contorno-derecha);
}
.contorno-paso > tr:first-child > td {
  --contorno-arriba: inset 0 2px 0 0 #eab308;
}
.contorno-paso > tr:last-child > td {
  --contorno-abajo: inset 0 -2px 0 0 #eab308;
}
.contorno-paso > tr > td:first-child {
  --contorno-izquierda: inset 2px 0 0 0 #eab308;
}
.contorno-paso > tr > td:last-child {
  --contorno-derecha: inset -2px 0 0 0 #eab308;
}
</style>
