<script setup>
import { computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { calcularEdad, calcularAntiguedad, convertirFechaISOaDDMMYYYY, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import { DIAGNOSTICO_CARDIOMETABOLICO_OPTS } from '@/helpers/eventoSeguimientoCardiometabolicoOptions';
import {
  claseCssEstadoCondicionEscVista,
  textoEstadoCondicionEscVista,
} from '@/helpers/cardiometabolico/coherenciaClinicaEsc';
import {
  clasificarColesterolTotal,
  clasificarGlucosa,
  clasificarHbA1c,
  clasificarHDL,
  clasificarLDL,
  clasificarTrigliceridos,
} from '@/helpers/cardiometabolico/laboratorioCategorias';
import { filaTratamientoTieneContenido } from '@/helpers/cardiometabolico/tratamientoActualFacilidades';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);

const esc = computed(() => formData.formDataEventoSeguimientoCardiometabolico);

const ctxCoherencia = computed(() => {
  const sexo = trabajadores.currentTrabajador?.sexo;
  if (sexo === 'Femenino') return { sexoPaciente: 'Femenino' };
  if (sexo === 'Masculino') return { sexoPaciente: 'Masculino' };
  return {};
});

const filasTratamientoVista = computed(() => {
  const arr = esc.value.tratamientoActual;
  if (!Array.isArray(arr)) return [];
  return arr.filter(filaTratamientoTieneContenido);
});

function fmt(v) {
  if (v === undefined || v === null || v === '') return '—';
  return String(v);
}

/** Misma convención que el PDF: mayúsculas tipográficas (es) en etiquetas de fila. */
function etiquetaVistaMayusc(s) {
  if (s === undefined || s === null || s === '') return '';
  return String(s).toLocaleUpperCase('es');
}

/** Una sola newline entre chips y texto libre; evita hueco grande con whitespace-pre-wrap. */
function fmtSintomasRelevantesVista(raw) {
  const t = fmt(raw);
  if (t === '—') return t;
  return t.replace(/\n\n+/g, '\n');
}

const FILAS_ESTADO_CONDICION = [
  { key: 'hipertensionArterial', label: 'Hipertensión arterial' },
  { key: 'diabetesMellitusTipo2', label: 'Diabetes mellitus tipo 2' },
  { key: 'dislipidemia', label: 'Dislipidemia' },
  { key: 'obesidad', label: 'Obesidad' },
];
const FILAS_ESTADO_CONDICION_IZQ = FILAS_ESTADO_CONDICION.slice(0, 2);
const FILAS_ESTADO_CONDICION_DER = FILAS_ESTADO_CONDICION.slice(2, 4);

function textoFilaEstadoCondicion(key) {
  return textoEstadoCondicionEscVista(esc.value, key, ctxCoherencia.value);
}

function claseTextoEstadoCondicion(key) {
  return claseCssEstadoCondicionEscVista(esc.value, key, ctxCoherencia.value);
}

function diagnosticoVigiladoActivo(codigo) {
  const arr = esc.value.diagnosticosActivos;
  return Array.isArray(arr) && arr.includes(codigo);
}

/** Hipertensión + DM2 | Dislipidemia + Obesidad (mismo orden que `DIAGNOSTICO_CARDIOMETABOLICO_OPTS`). */
const DIAGNOSTICOS_ESC_FILAS_IZQ = DIAGNOSTICO_CARDIOMETABOLICO_OPTS.slice(0, 2);
const DIAGNOSTICOS_ESC_FILAS_DER = DIAGNOSTICO_CARDIOMETABOLICO_OPTS.slice(2, 4);

function textoLineaLaboratorio(opts) {
  const { etiqueta, valorRaw, categoriaGuardada, unidad, clasificar } = opts;
  if (valorRaw === undefined || valorRaw === null || valorRaw === '') return null;
  const n = typeof valorRaw === 'number' ? valorRaw : Number(valorRaw);
  if (Number.isNaN(n)) return null;
  const cat = categoriaGuardada ?? clasificar(n) ?? '';
  return `${etiqueta}: ${n} ${unidad} — ${cat}`;
}

const lineasLaboratorio = computed(() => {
  const L = esc.value.laboratorio;
  if (!L) return [];
  const rows = [];
  const add = (line) => {
    if (line) rows.push(line);
  };
  add(
    textoLineaLaboratorio({
      etiqueta: 'Glucosa',
      valorRaw: L.glucosaMgDl,
      categoriaGuardada: L.categoriaGlucosa,
      unidad: 'mg/dL',
      clasificar: clasificarGlucosa,
    }),
  );
  add(
    textoLineaLaboratorio({
      etiqueta: 'HbA1c',
      valorRaw: L.hba1cPorcentaje,
      categoriaGuardada: L.categoriaHbA1c,
      unidad: '%',
      clasificar: clasificarHbA1c,
    }),
  );
  add(
    textoLineaLaboratorio({
      etiqueta: 'Colesterol total',
      valorRaw: L.colesterolTotalMgDl,
      categoriaGuardada: L.categoriaColesterolTotal,
      unidad: 'mg/dL',
      clasificar: clasificarColesterolTotal,
    }),
  );
  add(
    textoLineaLaboratorio({
      etiqueta: 'LDL',
      valorRaw: L.ldlMgDl,
      categoriaGuardada: L.categoriaLDL,
      unidad: 'mg/dL',
      clasificar: clasificarLDL,
    }),
  );
  add(
    textoLineaLaboratorio({
      etiqueta: 'HDL',
      valorRaw: L.hdlMgDl,
      categoriaGuardada: L.categoriaHDL,
      unidad: 'mg/dL',
      clasificar: clasificarHDL,
    }),
  );
  add(
    textoLineaLaboratorio({
      etiqueta: 'Triglicéridos',
      valorRaw: L.trigliceridosMgDl,
      categoriaGuardada: L.categoriaTrigliceridos,
      unidad: 'mg/dL',
      clasificar: clasificarTrigliceridos,
    }),
  );
  return rows;
});

const hayLaboratorio = computed(() => lineasLaboratorio.value.length > 0);

/** Convierte líneas «Glucosa: 99 mg/dL — Normal» en filas etiqueta / detalle para tabla. */
const filasLaboratorioParaTabla = computed(() =>
  lineasLaboratorio.value.map((linea) => {
    const idx = linea.indexOf(':');
    if (idx === -1) return { etiqueta: 'Dato', detalle: linea };
    return {
      etiqueta: linea.slice(0, idx).trim(),
      detalle: linea.slice(idx + 1).trim(),
    };
  }),
);

/** ≥2 analitos capturados: reparte filas en 2 tablas (md lado a lado). Con 1 fila, una sola tabla a ancho completo. */
const laboratorioDosColumnas = computed(
  () => filasLaboratorioParaTabla.value.length > 1,
);

const filasLaboratorioTablaIzquierda = computed(() => {
  const f = filasLaboratorioParaTabla.value;
  if (!laboratorioDosColumnas.value) return f;
  const mitad = Math.ceil(f.length / 2);
  return f.slice(0, mitad);
});

const filasLaboratorioTablaDerecha = computed(() => {
  const f = filasLaboratorioParaTabla.value;
  if (!laboratorioDosColumnas.value) return [];
  const mitad = Math.ceil(f.length / 2);
  return f.slice(mitad);
});

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};
</script>

<template>
  <div
    class="flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt
        v-if="isMX"
        :estado="formData.formDataEventoSeguimientoCardiometabolico.estado"
        :fechaFinalizacion="formData.formDataEventoSeguimientoCardiometabolico.fechaFinalizacion"
        :finalizadoPor="formData.formDataEventoSeguimientoCardiometabolico.finalizadoPor"
        :fechaAnulacion="formData.formDataEventoSeguimientoCardiometabolico.fechaAnulacion"
        :anuladoPor="formData.formDataEventoSeguimientoCardiometabolico.anuladoPor"
        :razonAnulacion="formData.formDataEventoSeguimientoCardiometabolico.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <!-- Empresa -->
      <div class="w-full md:w-2/5">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <!-- Fecha -->
      <div
      class="w-full md:w-[calc(50%-1rem)] flex flex-wrap gap-2 justify-start md:justify-end ml-auto text-sm sm:text-base cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
      @click="goToStep(1)">
      <p class="w-full md:w-auto">Fecha: <span class="font-medium">{{
        formatDateDDMMYYYY(formData.formDataEventoSeguimientoCardiometabolico.fechaEventoSeguimientoCardiometabolico) }}</span></p>
      </div>

      <!-- Motivo — en md el ancho es el del texto (sin partir palabras ni salto de línea forzado) -->
      <div
        class="w-full md:w-fit md:shrink-0 flex flex-wrap md:flex-nowrap gap-2 justify-end ml-auto text-xs sm:text-sm cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)"
      >
        <p class="w-full md:w-max md:whitespace-nowrap">
          Motivo de seguimiento: <span class="font-medium">{{ fmt(esc.motivoSeguimiento) }}</span>
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
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NACIMIENTO
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ convertirFechaISOaDDMMYYYY(trabajadores.currentTrabajador.fechaNacimiento) }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESCOLARIDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.escolaridad }}
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
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ANTIGUEDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              TELÉFONO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.telefono }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESTADO CIVIL
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.estadoCivil }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NUM. EMPLEADO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.numeroEmpleado || 'No asignado' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="w-full border-t pt-4 mt-2 space-y-4 text-sm sm:text-base">
      <div
        class="cursor-pointer rounded-lg p-2 -m2 border border-gray-100"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
        @click="goToStep(2)"
      >
        <h3 class="text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-1.5 mb-2">
          Diagnósticos activos
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 min-w-0">
          <table class="table-auto w-full min-w-0 border-collapse border border-gray-300 text-xs sm:text-sm">
            <tbody>
              <tr
                v-for="opt in DIAGNOSTICOS_ESC_FILAS_IZQ"
                :key="opt.value"
                class="odd:bg-white even:bg-gray-50"
                :class="{ 'bg-amber-50/90': diagnosticoVigiladoActivo(opt.value) }"
              >
                <td class="px-2 py-1.5 border border-gray-300 align-top text-gray-800 font-semibold">
                  {{ etiquetaVistaMayusc(opt.label) }}
                </td>
                <td
                  class="px-2 py-1.5 border border-gray-300 text-center align-top w-[22%] sm:w-24 font-normal"
                  :class="
                    diagnosticoVigiladoActivo(opt.value)
                      ? 'text-orange-600 tracking-tight'
                      : 'text-gray-400'
                  "
                >
                  {{ diagnosticoVigiladoActivo(opt.value) ? 'Activo' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>

          <table class="table-auto w-full min-w-0 border-collapse border border-gray-300 text-xs sm:text-sm">
            <tbody>
              <tr
                v-for="opt in DIAGNOSTICOS_ESC_FILAS_DER"
                :key="opt.value"
                class="odd:bg-white even:bg-gray-50"
                :class="{ 'bg-amber-50/90': diagnosticoVigiladoActivo(opt.value) }"
              >
                <td class="px-2 py-1.5 border border-gray-300 align-top text-gray-800 font-semibold">
                  {{ etiquetaVistaMayusc(opt.label) }}
                </td>
                <td
                  class="px-2 py-1.5 border border-gray-300 text-center align-top w-[22%] sm:w-24 font-normal"
                  :class="
                    diagnosticoVigiladoActivo(opt.value)
                      ? 'text-orange-600 tracking-tight'
                      : 'text-gray-400'
                  "
                >
                  {{ diagnosticoVigiladoActivo(opt.value) ? 'Activo' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 justify-start w-full min-w-0 rounded-lg p-2 border border-gray-100">
        <!-- Somatometría (compacta, estilo exploración física) -->
        <div
          class="w-full md:w-[calc(50%-0.5rem)] min-w-0 cursor-pointer"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 3 }"
          @click="goToStep(3)"
        >
          <h3 class="text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-1.5 mb-2">
            Somatometría
          </h3>
          <table
            class="table-auto w-full border-collapse border border-gray-200 text-xs sm:text-sm"
          >
            <thead>
              <tr class="bg-gray-200">
                <th class="w-2/5 px-2 py-0 border border-gray-300 text-left font-semibold text-gray-800">
                  Parámetro
                </th>
                <th class="w-1/5 px-2 py-0 border border-gray-300 text-center font-semibold text-gray-800">
                  Especifique
                </th>
                <th class="px-2 py-0 border border-gray-300 text-center font-semibold text-gray-800">
                  Categoría
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50">
                <td class="px-2 py-0 border border-gray-300 font-medium">PESO</td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{
                    esc.somatometria?.peso != null && esc.somatometria.peso !== ''
                      ? `${fmt(esc.somatometria.peso)} kg`
                      : ''
                  }}
                </td>
                <td class="text-center px-2 py-0 border border-gray-300 bg-gray-200 text-gray-400">-</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50">
                <td class="px-2 py-0 border border-gray-300 font-medium">ALTURA</td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{
                    esc.somatometria?.altura != null && esc.somatometria.altura !== ''
                      ? `${fmt(esc.somatometria.altura)} m`
                      : ''
                  }}
                </td>
                <td class="text-center px-2 py-0 border border-gray-300 bg-gray-200 text-gray-400">-</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50">
                <td class="px-2 py-0 border border-gray-300 font-medium">ÍNDICE DE MASA CORPORAL</td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{ esc.somatometria ? fmt(esc.somatometria.indiceMasaCorporal) : '' }}
                </td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{ esc.somatometria ? fmt(esc.somatometria.categoriaIMC) : '' }}
                </td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50">
                <td class="px-2 py-0 border border-gray-300 font-medium">CIRCUNFERENCIA CINTURA</td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{
                    esc.somatometria?.circunferenciaCintura != null
                    && esc.somatometria.circunferenciaCintura !== ''
                      ? `${fmt(esc.somatometria.circunferenciaCintura)} cm`
                      : ''
                  }}
                </td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{ esc.somatometria ? fmt(esc.somatometria.categoriaCircunferenciaCintura) : '' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Signos vitales (misma rejilla; FR y SpO₂ no aplican en este evento) -->
        <div
          class="w-full md:w-[calc(50%)] min-w-0 cursor-pointer"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 4 }"
          @click="goToStep(4)"
        >
          <h3 class="text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-1.5 mb-2">
            Signos vitales
          </h3>
          <table
            class="table-auto w-full border-collapse border border-gray-200 text-xs sm:text-sm"
          >
            <thead>
              <tr class="bg-gray-200">
                <th class="w-2/5 px-2 py-0 border border-gray-300 text-left font-semibold text-gray-800">
                  Parámetro
                </th>
                <th class="w-1/5 px-2 py-0 border border-gray-300 text-center font-semibold text-gray-800">
                  Especifique
                </th>
                <th class="px-2 py-0 border border-gray-300 text-center font-semibold text-gray-800">
                  Categoría
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50">
                <td class="px-2 py-0 border border-gray-300 font-medium">TENSIÓN ARTERIAL</td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{
                    esc.signosVitales
                    && (
                      (esc.signosVitales.tensionArterialSistolica != null
                        && esc.signosVitales.tensionArterialSistolica !== '')
                      || (esc.signosVitales.tensionArterialDiastolica != null
                        && esc.signosVitales.tensionArterialDiastolica !== '')
                    )
                      ? `${fmt(esc.signosVitales.tensionArterialSistolica)}/${fmt(esc.signosVitales.tensionArterialDiastolica)} mmHg`
                      : ''
                  }}
                </td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{ esc.signosVitales ? fmt(esc.signosVitales.categoriaTensionArterial) : '' }}
                </td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50">
                <td class="px-2 py-0 border border-gray-300 font-medium">FRECUENCIA CARDIACA</td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{
                    esc.signosVitales?.frecuenciaCardiaca != null
                    && esc.signosVitales.frecuenciaCardiaca !== ''
                      ? `${fmt(esc.signosVitales.frecuenciaCardiaca)} lpm`
                      : ''
                  }}
                </td>
                <td class="text-center px-2 py-0 border border-gray-300">
                  {{ esc.signosVitales ? fmt(esc.signosVitales.categoriaFrecuenciaCardiaca) : '' }}
                </td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50">
                <td class="text-center px-2 py-0 border border-gray-300 bg-gray-200 text-gray-400">-</td>
                <td class="text-center px-2 py-0 border border-gray-300 bg-gray-200 text-gray-400">-</td>
                <td class="text-center px-2 py-0 border border-gray-300 bg-gray-200 text-gray-400">-</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50">
                <td class="text-center px-2 py-0 border border-gray-300 bg-gray-200 text-gray-400">-</td>
                <td class="text-center px-2 py-0 border border-gray-300 bg-gray-200 text-gray-400">-</td>
                <td class="text-center px-2 py-0 border border-gray-300 bg-gray-200 text-gray-400">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        class="cursor-pointer rounded-lg p-2 -m2 border border-gray-100"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 5 }"
        @click="goToStep(5)"
      >
        <h3 class="text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-1.5 mb-2">
          Laboratorio
        </h3>
        <div
          v-if="hayLaboratorio"
          :class="laboratorioDosColumnas ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : ''"
        >
          <table
            class="table-auto w-full min-w-0 border-collapse border border-gray-300 text-xs sm:text-sm"
          >
            <thead>
              <tr class="bg-gray-100">
                <th scope="col" class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800 w-[28%] sm:w-1/4">
                  Componente
                </th>
                <th scope="col" class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(fila, i) in filasLaboratorioTablaIzquierda"
                :key="`lab-izq-${i}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="px-2 py-1.5 border border-gray-300 font-medium text-gray-900 align-top whitespace-nowrap">
                  {{ fila.etiqueta }}
                </td>
                <td class="px-2 py-1.5 border border-gray-300 align-top text-gray-800 leading-snug">
                  {{ fila.detalle }}
                </td>
              </tr>
            </tbody>
          </table>

          <table
            v-if="laboratorioDosColumnas"
            class="table-auto w-full min-w-0 border-collapse border border-gray-300 text-xs sm:text-sm"
          >
            <thead>
              <tr class="bg-gray-100">
                <th scope="col" class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800 w-[28%] sm:w-1/4">
                  Componente
                </th>
                <th scope="col" class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(fila, i) in filasLaboratorioTablaDerecha"
                :key="`lab-der-${i}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="px-2 py-1.5 border border-gray-300 font-medium text-gray-800 align-top whitespace-nowrap">
                  {{ fila.etiqueta }}
                </td>
                <td class="px-2 py-1.5 border border-gray-300 align-top text-gray-800 leading-snug">
                  {{ fila.detalle }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-else
          class="text-xs sm:text-sm text-gray-700 border border-gray-300 border-dashed px-2 py-2 bg-gray-50/50"
        >
          Sin datos de laboratorio.
        </p>
      </div>

      <div
        class="cursor-pointer rounded-lg p-2 -m2 border border-gray-100"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 6 }"
        @click="goToStep(6)"
      >
        <h3 class="text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-1.5 mb-2">
          Tratamiento actual
        </h3>
        <div v-if="filasTratamientoVista.length" class="overflow-x-auto">
          <table class="table-auto w-full min-w-[520px] border-collapse border border-gray-300 text-xs sm:text-sm">
            <thead>
              <tr class="bg-gray-100">
                <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800">
                  Medicamento
                </th>
                <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800">
                  Dosis
                </th>
                <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800">
                  Frecuencia
                </th>
                <th class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800">
                  Motivo de uso
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(fila, idx) in filasTratamientoVista"
                :key="idx"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="px-2 py-1.5 border border-gray-300 align-top text-gray-800">
                  {{ fmt(fila.medicamento) }}
                </td>
                <td class="px-2 py-1.5 border border-gray-300 align-top text-gray-800">
                  {{ fmt(fila.dosis) }}
                </td>
                <td class="px-2 py-1.5 border border-gray-300 align-top text-gray-800">
                  {{ fmt(fila.frecuencia) }}
                </td>
                <td class="px-2 py-1.5 border border-gray-300 align-top text-gray-800">
                  {{ fmt(fila.motivoUso) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-else
          class="text-xs sm:text-sm text-gray-700 border border-gray-300 border-dashed px-2 py-2 bg-gray-50/50"
        >
          Sin medicamentos registrados en esta visita.
        </p>
      </div>

      <div
        class="cursor-pointer rounded-lg p-2 -m2 border border-gray-100"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 7 }"
        @click="goToStep(7)"
      >
        <h3 class="text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-1.5 mb-2">
          Adherencia y síntomas
        </h3>
        <table class="table-auto w-full border-collapse border border-gray-300 text-xs sm:text-sm">
          <thead>
            <tr class="bg-gray-100">
              <th scope="col" class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800 w-[28%] sm:w-1/4">
                Campo
              </th>
              <th scope="col" class="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-800">
                Registro
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="odd:bg-white even:bg-gray-50">
              <td class="px-2 py-1.5 border border-gray-300 font-semibold text-gray-800 align-top">
                {{ etiquetaVistaMayusc('Adherencia terapéutica') }}
              </td>
              <td
                class="px-2 py-1.5 border border-gray-300 font-normal text-gray-800 align-top leading-snug whitespace-pre-wrap"
              >
                {{ fmt(esc.adherenciaTerapeutica) }}
              </td>
            </tr>
            <tr class="odd:bg-white even:bg-gray-50">
              <td class="px-2 py-1.5 border border-gray-300 font-semibold text-gray-800 align-top">
                {{ etiquetaVistaMayusc('Síntomas relevantes') }}
              </td>
              <td
                class="px-2 py-1.5 border border-gray-300 font-normal text-gray-800 align-top leading-snug whitespace-pre-wrap"
              >
                {{ fmtSintomasRelevantesVista(esc.sintomasRelevantes) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="cursor-pointer rounded-lg p-2 -m2 border border-gray-100"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 8 }"
        @click="goToStep(8)"
      >
        <h3 class="text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-1.5 mb-2">
          Estado por condición en esta visita
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 min-w-0">
          <table
            class="table-auto w-full min-w-0 border-collapse border border-gray-300 text-xs sm:text-sm"
          >
            <tbody>
              <tr
                v-for="fila in FILAS_ESTADO_CONDICION_IZQ"
                :key="fila.key"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="w-[28%] sm:w-1/3 px-2 py-1.5 border border-gray-300 font-semibold align-top text-gray-800 whitespace-nowrap">
                  {{ etiquetaVistaMayusc(fila.label) }}
                </td>
                <td
                  class="px-2 py-1.5 border border-gray-300 font-normal align-top leading-snug text-center"
                  :class="claseTextoEstadoCondicion(fila.key)"
                >
                  {{ textoFilaEstadoCondicion(fila.key) }}
                </td>
              </tr>
            </tbody>
          </table>
          <table
            class="table-auto w-full min-w-0 border-collapse border border-gray-300 text-xs sm:text-sm"
          >
            <tbody>
              <tr
                v-for="fila in FILAS_ESTADO_CONDICION_DER"
                :key="fila.key"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="w-[28%] sm:w-1/3 px-2 py-1.5 border border-gray-300 font-semibold align-top text-gray-800 whitespace-nowrap">
                  {{ etiquetaVistaMayusc(fila.label) }}
                </td>
                <td
                  class="px-2 py-1.5 border border-gray-300 font-normal align-top leading-snug text-center"
                  :class="claseTextoEstadoCondicion(fila.key)"
                >
                  {{ textoFilaEstadoCondicion(fila.key) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        class="cursor-pointer rounded-lg p-2 -m2 border border-gray-100"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 9 }"
        @click="goToStep(9)"
      >
        <h3 class="text-center text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-1.5 mb-2">
          Riesgos y próxima cita
        </h3>
        <div
          class="grid grid-cols-1 md:grid-cols-12 gap-0 border border-gray-300 rounded-sm overflow-hidden text-xs sm:text-sm"
        >
          <div class="md:col-span-10 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-gray-300 bg-white">
            <div class="bg-gray-100 px-2 py-1.5 border-b border-gray-300 font-semibold text-gray-800 shrink-0">
              {{ etiquetaVistaMayusc('Riesgos actuales') }}
            </div>
            <div class="px-2 py-1.5 font-normal text-gray-800 leading-snug whitespace-pre-wrap flex-1 bg-white">
              {{ fmt(esc.riesgosActuales) }}
            </div>
          </div>
          <div class="md:col-span-2 flex flex-col min-w-0 bg-gray-50 md:bg-white">
            <div class="bg-gray-100 px-2 py-1.5 border-b border-gray-300 font-semibold text-gray-800 shrink-0 text-center">
              {{ etiquetaVistaMayusc('Próxima cita') }}
            </div>
            <div class="px-2 py-1.5 font-normal text-gray-800 leading-snug text-center bg-white">
              {{ formatDateDDMMYYYY(esc.proximaRevisionSugerida) || '—' }}
            </div>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: #f0f0f0;
  /* Cambia el color según tu diseño */
}

.control-prenatal-gineco tbody tr.cursor-pointer,
.control-prenatal-gineco thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.control-prenatal-gineco tbody tr.cursor-pointer > td,
.control-prenatal-gineco tbody tr.cursor-pointer > th,
.control-prenatal-gineco thead tr.cursor-pointer > td,
.control-prenatal-gineco thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.control-prenatal-gineco tbody tr.cursor-pointer:hover,
.control-prenatal-gineco tbody tr.cursor-pointer:hover > td,
.control-prenatal-gineco tbody tr.cursor-pointer:hover > th,
.control-prenatal-gineco thead tr.cursor-pointer:hover,
.control-prenatal-gineco thead tr.cursor-pointer:hover > td,
.control-prenatal-gineco thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}

.control-prenatal-meses td.cursor-pointer {
  transition: background-color 0.15s ease, color 0.15s ease;
}
</style>

<style>
html.dark-mode .control-prenatal-gineco tbody tr.cursor-pointer:hover,
html.dark-mode .control-prenatal-gineco tbody tr.cursor-pointer:hover > td,
html.dark-mode .control-prenatal-gineco tbody tr.cursor-pointer:hover > th,
html.dark-mode .control-prenatal-gineco thead tr.cursor-pointer:hover,
html.dark-mode .control-prenatal-gineco thead tr.cursor-pointer:hover > td,
html.dark-mode .control-prenatal-gineco thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

/* En oscuro, evitar hover claro que borra contraste en las celdas mensuales. */
html.dark-mode .control-prenatal-meses td.cursor-pointer:hover {
  background-color: #334155 !important;
  color: #f8fafc !important;
}
</style>
