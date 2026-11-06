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
  COLUMNAS_SIGNOS_NOTA_ENFERMERIA,
  DESTINOS_NOTA_ENFERMERIA,
  ORIGENES_NOTA_ENFERMERIA,
  PASO_CIERRE_NOTA_ENFERMERIA,
  PASO_CLASIFICACION_NOTA_ENFERMERIA,
  PASO_DATOS_NOTA_ENFERMERIA,
  PASO_MEDICAMENTOS_NOTA_ENFERMERIA,
  PASO_ORIGEN_NOTA_ENFERMERIA,
  PASO_PROCEDIMIENTOS_NOTA_ENFERMERIA,
  PASO_SIGNOS_NOTA_ENFERMERIA,
  RELACIONES_TEMPORALES_NOTA_ENFERMERIA,
  SISTEMAS_NOTA_ENFERMERIA,
  TIPOS_PROBLEMA_NOTA_ENFERMERIA,
  VIAS_ADMINISTRACION_NOTA_ENFERMERIA,
  etiquetaNotaEnfermeria,
  filasSignosNotaEnfermeria,
  textoProcedimientosNotaEnfermeria,
} from '@/helpers/notaEnfermeria';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad } = useEdadAntiguedadDocumento(() => formData.formDataNotaEnfermeria.fechaNotaEnfermeria);
const stepsStore = useStepsStore();
const scrollRoot = ref(null);
useVisualizadorScrollPaso(scrollRoot, () => stepsStore.currentStep);

const fd = computed(() => formData.formDataNotaEnfermeria);

const clasificacion = computed(() => [
  { titulo: 'TIPO DE PROBLEMA', valor: etiquetaNotaEnfermeria(TIPOS_PROBLEMA_NOTA_ENFERMERIA, fd.value.tipoProblema), paso: PASO_CLASIFICACION_NOTA_ENFERMERIA },
  { titulo: 'APARATO O SISTEMA', valor: etiquetaNotaEnfermeria(SISTEMAS_NOTA_ENFERMERIA, fd.value.sistema), paso: PASO_CLASIFICACION_NOTA_ENFERMERIA },
  // El origen se captura junto con el aspecto general
  { titulo: 'ORIGEN', valor: etiquetaNotaEnfermeria(ORIGENES_NOTA_ENFERMERIA, fd.value.origen), paso: PASO_ORIGEN_NOTA_ENFERMERIA },
]);

const filasSignos = computed(() => filasSignosNotaEnfermeria(fd.value));
const procedimientos = computed(() => textoProcedimientosNotaEnfermeria(fd.value));
const medicamentos = computed(() => fd.value.medicamentos ?? []);

const irASiExiste = (stepNumber) => {
  if (stepNumber >= 1 && stepNumber <= stepsStore.steps.length) {
    stepsStore.goToStep(stepNumber);
  }
};

const resaltePaso = (paso) =>
  stepsStore.currentStep === paso ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : '';

const celda = 'text-xs sm:text-sm px-2 py-0 border border-gray-300';
</script>

<template>
  <div
    ref="scrollRoot"
    class="visualizador-nota-enfermeria flex flex-col gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
  >
    <!-- Empresa, fecha, hora y relación temporal (paso 1) -->
    <div class="flex flex-wrap w-full gap-1 md:gap-4 shrink-0">
      <div class="w-full md:w-[calc(60%-0.5rem)]">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>
      <div
        class="w-full md:w-[calc(40%-0.5rem)] flex flex-wrap gap-x-3 justify-end text-sm sm:text-base cursor-pointer"
        :data-paso="PASO_DATOS_NOTA_ENFERMERIA"
        :class="resaltePaso(PASO_DATOS_NOTA_ENFERMERIA)"
        @click="irASiExiste(PASO_DATOS_NOTA_ENFERMERIA)"
      >
        <p>
          Fecha: <span class="font-medium">{{ formatDateDDMMYYYY(fd.fechaNotaEnfermeria) }}</span>
        </p>
        <p>
          Hora: <span class="font-medium">{{ fd.horaAtencion || '—' }}</span>
        </p>
        <p class="w-full text-right text-xs text-gray-600">
          {{ etiquetaNotaEnfermeria(RELACIONES_TEMPORALES_NOTA_ENFERMERIA, fd.relacionTemporal) || 'Primera vez o subsecuente sin indicar' }}
        </p>
      </div>
    </div>

    <!-- Trabajador -->
    <div class="w-full shrink-0">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td :class="[celda, 'w-1/4 font-light']">NOMBRE</td>
            <td :class="[celda, 'w-1/4 font-medium']">{{ formatNombreCompleto(trabajadores.currentTrabajador) }}</td>
            <td :class="[celda, 'font-light']">EDAD</td>
            <td :class="[celda, 'font-medium']">{{ edad }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td :class="[celda, 'font-light']">PUESTO</td>
            <td :class="[celda, 'font-medium']">{{ trabajadores.currentTrabajador.puesto }}</td>
            <td :class="[celda, 'font-light']">SEXO</td>
            <td :class="[celda, 'font-medium']">{{ trabajadores.currentTrabajador.sexo }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-base font-semibold text-gray-900 shrink-0">Nota de enfermería</h3>

    <!-- Motivo (paso 1) -->
    <p
      class="text-sm text-gray-800 cursor-pointer shrink-0"
      :data-paso="PASO_DATOS_NOTA_ENFERMERIA"
      :class="resaltePaso(PASO_DATOS_NOTA_ENFERMERIA)"
      @click="irASiExiste(PASO_DATOS_NOTA_ENFERMERIA)"
    >
      <span class="font-semibold">Motivo de atención:</span>
      {{ fd.motivoAtencion || 'Sin capturar' }}
    </p>

    <!-- Clasificación (pasos 2 y 3) -->
    <div class="shrink-0">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr
            v-for="fila in clasificacion"
            :key="fila.titulo"
            class="cursor-pointer odd:bg-white even:bg-gray-50"
            :data-paso="fila.paso"
            :class="resaltePaso(fila.paso)"
            @click="irASiExiste(fila.paso)"
          >
            <td :class="[celda, 'w-1/3 font-light']">{{ fila.titulo }}</td>
            <td :class="[celda, fila.valor ? 'font-medium' : 'text-amber-700']">{{ fila.valor || 'Sin elegir' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Aspecto general (paso 3) -->
    <p
      class="shrink-0 cursor-pointer text-sm text-gray-800"
      :data-paso="PASO_ORIGEN_NOTA_ENFERMERIA"
      :class="resaltePaso(PASO_ORIGEN_NOTA_ENFERMERIA)"
      @click="irASiExiste(PASO_ORIGEN_NOTA_ENFERMERIA)"
    >
      <span class="font-semibold">Aspecto general (hábitus exterior):</span>
      {{ fd.habitusExterior || 'Sin capturar' }}
    </p>

    <!-- Signos vitales (paso 4) -->
    <div
      class="shrink-0 cursor-pointer space-y-2"
      :data-paso="PASO_SIGNOS_NOTA_ENFERMERIA"
      :class="resaltePaso(PASO_SIGNOS_NOTA_ENFERMERIA)"
      @click="irASiExiste(PASO_SIGNOS_NOTA_ENFERMERIA)"
    >
      <div v-if="filasSignos.length" class="overflow-x-auto -mx-1 sm:mx-0">
        <table class="table-auto w-full min-w-[560px] border-collapse border border-gray-200 text-xs" data-signos>
          <thead>
            <tr class="bg-gray-100 text-gray-700">
              <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold">Toma</th>
              <th class="px-2 py-1.5 border border-gray-300 font-semibold">Hora</th>
              <th
                v-for="columna in COLUMNAS_SIGNOS_NOTA_ENFERMERIA"
                :key="columna.titulo"
                class="px-1 py-1.5 border border-gray-300 text-center font-semibold"
              >
                {{ columna.titulo }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in filasSignos" :key="fila.toma">
              <td class="px-2 py-1 border border-gray-300 font-semibold whitespace-nowrap">{{ fila.toma }}</td>
              <td class="px-2 py-1 border border-gray-300 text-center">{{ fila.hora || '—' }}</td>
              <td
                v-for="columna in COLUMNAS_SIGNOS_NOTA_ENFERMERIA"
                :key="columna.titulo"
                class="px-1 py-1 border border-gray-300 text-center"
              >
                {{ columna.valor(fila.datos) || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-xs italic text-gray-500">Sin signos vitales registrados</p>
    </div>

    <!-- Procedimientos (paso 5) -->
    <div
      class="shrink-0 cursor-pointer space-y-2"
      :data-paso="PASO_PROCEDIMIENTOS_NOTA_ENFERMERIA"
      :class="resaltePaso(PASO_PROCEDIMIENTOS_NOTA_ENFERMERIA)"
      @click="irASiExiste(PASO_PROCEDIMIENTOS_NOTA_ENFERMERIA)"
    >
      <p class="text-sm text-gray-800">
        <span class="font-semibold">Procedimientos realizados:</span>
        {{ procedimientos || 'Ninguno' }}
      </p>
      <p v-if="fd.detalleProcedimientos" class="text-sm text-gray-800">
        <span class="font-semibold">Detalle:</span>
        {{ fd.detalleProcedimientos }}
      </p>
    </div>

    <!-- Medicamentos (paso 6) -->
    <div
      class="shrink-0 cursor-pointer space-y-2"
      :data-paso="PASO_MEDICAMENTOS_NOTA_ENFERMERIA"
      :class="resaltePaso(PASO_MEDICAMENTOS_NOTA_ENFERMERIA)"
      @click="irASiExiste(PASO_MEDICAMENTOS_NOTA_ENFERMERIA)"
    >
      <table
        v-if="medicamentos.length"
        class="table-auto w-full border-collapse border border-gray-200 text-xs"
        data-medicamentos
      >
        <thead>
          <tr class="bg-gray-100 text-gray-700">
            <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold">Medicamento</th>
            <th class="px-2 py-1.5 border border-gray-300 font-semibold">Cantidad</th>
            <th class="px-2 py-1.5 border border-gray-300 font-semibold">Uso</th>
            <th class="px-2 py-1.5 border border-gray-300 font-semibold">Vía</th>
            <th class="px-2 py-1.5 border border-gray-300 font-semibold">Dosis</th>
            <th class="px-2 py-1.5 border border-gray-300 font-semibold">Hora</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(m, i) in medicamentos" :key="i">
            <td class="px-2 py-1 border border-gray-300">{{ m.nombre || '—' }}</td>
            <td class="px-2 py-1 border border-gray-300 text-center">{{ m.cantidad }}</td>
            <td class="px-2 py-1 border border-gray-300 text-center">
              {{ m.uso === 'ENTREGADO' ? 'Entregado' : 'Administrado' }}
            </td>
            <td class="px-2 py-1 border border-gray-300 text-center">
              {{ etiquetaNotaEnfermeria(VIAS_ADMINISTRACION_NOTA_ENFERMERIA, m.via) || '—' }}
            </td>
            <td class="px-2 py-1 border border-gray-300 text-center">{{ m.dosis || '—' }}</td>
            <td class="px-2 py-1 border border-gray-300 text-center">{{ m.hora || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-xs italic text-gray-500">Sin medicamentos administrados ni entregados</p>
    </div>

    <!-- Cierre (paso 7) -->
    <div
      class="shrink-0 cursor-pointer space-y-2"
      :data-paso="PASO_CIERRE_NOTA_ENFERMERIA"
      :class="resaltePaso(PASO_CIERRE_NOTA_ENFERMERIA)"
      @click="irASiExiste(PASO_CIERRE_NOTA_ENFERMERIA)"
    >
      <p class="text-sm text-gray-800">
        <!-- Entre dos etiquetas Vue no conserva el salto de línea: el espacio va explícito -->
        <span class="font-semibold">Destino del trabajador:</span>{{ ' ' }}
        <span :class="fd.destino ? '' : 'text-amber-700'">
          {{ etiquetaNotaEnfermeria(DESTINOS_NOTA_ENFERMERIA, fd.destino) || 'Sin elegir' }}
        </span>
      </p>
      <p class="text-sm text-gray-800">
        <span class="font-semibold">Recomendaciones e indicaciones:</span>
        {{ fd.recomendaciones || 'Sin recomendaciones' }}
      </p>
      <p class="text-sm text-gray-800">
        <span class="font-semibold">Observaciones:</span>
        {{ fd.observaciones || 'Sin observaciones' }}
      </p>
    </div>
  </div>
</template>
