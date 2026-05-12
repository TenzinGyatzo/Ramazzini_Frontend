<script setup>
import { computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { calcularEdad, calcularAntiguedad, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();

const fm = computed(() => formData.formDataInformeLongitudinalCardiometabolico);

function goToStep(stepNumber) {
  steps.goToStep(stepNumber);
}

function texto(v) {
  if (v == null || v === '') return '—';
  return String(v);
}

const fechaInformeFmt = computed(() =>
  formatDateDDMMYYYY(fm.value?.fechaInformeLongitudinalCardiometabolico),
);

const periodoFmt = computed(() => {
  const a = fm.value?.periodoInicio ? formatDateDDMMYYYY(fm.value.periodoInicio) : '—';
  const b = fm.value?.periodoFin ? formatDateDDMMYYYY(fm.value.periodoFin) : '—';
  return `${a} – ${b}`;
});

const riesgoLongitudinalLegible = computed(() => {
  const v = fm.value?.nivelRiesgoLongitudinal;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
});

function formatoIndicador(o) {
  if (!o || typeof o !== 'object') return '';
  const vi = o.valorInicial;
  const vf = o.valorFinal;
  if (vi == null && vf == null) return '';
  const tramo = vi != null && vf != null ? `${vi} → ${vf}` : vi != null ? `${vi}` : `${vf}`;
  const delta = o.cambioAbsoluto != null && vi != null && vf != null ? ` (Δ ${o.cambioAbsoluto})` : '';
  const tend = o.tendencia ? ` · ${o.tendencia}` : ' · —';
  return `${tramo}${delta}${tend}`;
}

const resumenIndicadoresLineas = computed(() => {
  const r = fm.value?.resumenIndicadores;
  if (!r || typeof r !== 'object') return [];
  const lines = [];
  const push = (label, o) => {
    const t = formatoIndicador(o);
    if (!t) return;
    lines.push({ label, texto: t });
  };
  push('TA sistólica (mmHg)', r.tensionArterialSistolica);
  push('TA diastólica (mmHg)', r.tensionArterialDiastolica);
  push('Peso (kg)', r.peso);
  push('IMC', r.indiceMasaCorporal);
  push('Glucosa (mg/dL)', r.glucosaMgDl);
  push('HbA1c (%)', r.hba1cPorcentaje);
  return lines;
});

const resumenCondicionesBloques = computed(() => {
  const rc = fm.value?.resumenCondiciones;
  if (!rc || typeof rc !== 'object') return [];
  const out = [];
  const push = (titulo, bloque) => {
    if (!bloque || typeof bloque !== 'object') return;
    const parts = [];
    if (bloque.presente != null) parts.push(`Presente: ${bloque.presente ? 'Sí' : 'No'}`);
    if (bloque.estadoActual) parts.push(`Estado: ${bloque.estadoActual}`);
    if (bloque.gradoActual) parts.push(`Grado: ${bloque.gradoActual}`);
    if (bloque.tendencia) parts.push(`Tendencia: ${bloque.tendencia}`);
    if (bloque.interpretacionAutomatica) parts.push(bloque.interpretacionAutomatica);
    if (bloque.observaciones) parts.push(bloque.observaciones);
    if (parts.length) out.push({ titulo, texto: parts.join(' · ') });
  };
  push('Hipertensión', rc.hipertension);
  push('Diabetes', rc.diabetes);
  push('Dislipidemia', rc.dislipidemia);
  push('Obesidad', rc.obesidad);
  return out;
});

const hayBorradorAutomatico = computed(
  () =>
    !!(fm.value?.resumenLongitudinalSugerido ||
      fm.value?.conclusionClinicaSugerida ||
      fm.value?.recomendacionesSugeridas ||
      fm.value?.limitacionesSugeridas),
);
</script>

<template>
  <div
    class="visualizador-historia-otologica flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
  >
    <!-- Encabezado -->
    <div class="flex flex-wrap w-full gap-1 md:gap-4">
      <div class="w-full md:w-[calc(75%-0.5rem)]">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <div
        class="w-full md:w-[calc(25%-0.5rem)] flex flex-wrap gap-2 justify-end text-sm sm:text-base cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)"
      >
        <p class="w-full md:w-auto">
          Fecha informe:
          <span class="font-medium">{{ fechaInformeFmt }}</span>
        </p>
      </div>
    </div>

    <!-- Datos trabajador -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">NOMBRE</td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">EDAD</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}
            </td>
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
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">ESCOLARIDAD</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.escolaridad }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">ANTIGUEDAD</td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Bloque inicial: interpretación clínica -->
    <div
      class="w-full border border-gray-200 rounded-md p-4 cursor-pointer bg-white"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
      @click="goToStep(2)"
    >
      <h3 class="text-sm font-semibold text-gray-900 mb-3">Interpretación clínica</h3>

      <div class="rounded-md border-2 border-rose-200 bg-rose-50/90 px-3 py-2 mb-4">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-rose-900/80">Riesgo longitudinal</p>
        <p class="text-xl sm:text-2xl font-bold text-rose-950">{{ riesgoLongitudinalLegible }}</p>
      </div>

      <div v-if="fm.conclusionClinica" class="mt-3">
        <p class="text-xs font-medium text-gray-600 mb-1">Conclusión clínica</p>
        <p class="text-sm whitespace-pre-wrap">{{ fm.conclusionClinica }}</p>
      </div>

      <div v-if="fm.resumenLongitudinal" class="mt-3">
        <p class="text-xs font-medium text-gray-600 mb-1">Resumen longitudinal</p>
        <p class="text-sm whitespace-pre-wrap">{{ fm.resumenLongitudinal }}</p>
      </div>

      <div v-if="fm.interpretacionRiesgoLongitudinal" class="mt-3">
        <p class="text-xs font-medium text-gray-600 mb-1">Interpretación del riesgo longitudinal</p>
        <p class="text-sm whitespace-pre-wrap">{{ fm.interpretacionRiesgoLongitudinal }}</p>
      </div>

      <div v-if="(fm.factoresPersistentes || []).length" class="mt-3">
        <p class="text-xs font-medium text-gray-600 mb-1">Factores persistentes</p>
        <ul class="list-disc list-inside text-sm">
          <li v-for="(d, i) in fm.factoresPersistentes" :key="'f' + i">{{ d }}</li>
        </ul>
      </div>

      <div v-if="(fm.alertasRelevantes || []).length" class="mt-3">
        <p class="text-xs font-medium text-gray-600 mb-1">Alertas relevantes</p>
        <ul class="list-disc list-inside text-sm">
          <li v-for="(d, i) in fm.alertasRelevantes" :key="'a' + i">{{ d }}</li>
        </ul>
      </div>

      <p v-if="fm.consistenciaSeguimiento" class="text-sm mt-3">
        <span class="text-gray-500">Consistencia del seguimiento:</span>
        <span class="font-medium">{{ texto(fm.consistenciaSeguimiento) }}</span>
      </p>
    </div>

    <!-- Evolución principal -->
    <div
      v-if="resumenIndicadoresLineas.length"
      class="w-full border border-gray-200 rounded-md p-3 bg-slate-50/80"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
      @click="goToStep(2)"
    >
      <h3 class="text-sm font-semibold text-gray-800 mb-2">Evolución principal</h3>
      <ul class="text-xs sm:text-sm text-gray-800 space-y-1">
        <li v-for="(row, i) in resumenIndicadoresLineas" :key="i">
          <span class="font-medium">{{ row.label }}:</span> {{ row.texto }}
        </li>
      </ul>
    </div>

    <!-- Estado por condición -->
    <div
      v-if="resumenCondicionesBloques.length"
      class="w-full border border-gray-200 rounded-md p-3"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
      @click="goToStep(2)"
    >
      <h3 class="text-sm font-semibold text-gray-800 mb-2">Estado por condición</h3>
      <ul class="text-sm space-y-2">
        <li v-for="(b, i) in resumenCondicionesBloques" :key="i" class="border-b border-gray-100 pb-2 last:border-0">
          <span class="font-medium text-gray-800">{{ b.titulo }}:</span>
          {{ b.texto }}
        </li>
      </ul>
    </div>

    <!-- Periodo y evidencia (paso 1) -->
    <div
      class="w-full border border-gray-200 rounded-md p-3 cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 1 }"
      @click="goToStep(1)"
    >
      <h3 class="text-sm font-semibold text-gray-800 mb-2">Periodo y evidencia</h3>
      <p class="text-sm"><span class="text-gray-500">Periodo:</span> {{ periodoFmt }}</p>
      <p class="text-sm mt-1">
        <span class="text-gray-500">Último evento considerado:</span>
        {{
          fm.fechaUltimoEventoConsiderado ? formatDateDDMMYYYY(fm.fechaUltimoEventoConsiderado) : '—'
        }}
      </p>
      <p class="text-sm mt-1">
        <span class="text-gray-500">Eventos incluidos:</span> {{ texto(fm.numeroEventosIncluidos) }} ·
        <span class="text-gray-500">Seguimientos programados:</span>
        {{ texto(fm.numeroSeguimientosProgramados ?? (fm.seguimientosProgramadosIncluidos?.length ?? 0)) }}
      </p>

      <div v-if="(fm.eventosConcentrados || []).length" class="mt-3 overflow-x-auto">
        <p class="text-xs font-medium text-gray-600 mb-1">Eventos concentrados</p>
        <table class="min-w-full text-xs border-collapse border border-gray-200">
          <thead>
            <tr class="bg-gray-50">
              <th class="border border-gray-200 px-2 py-1 text-left">Fecha</th>
              <th class="border border-gray-200 px-2 py-1 text-left">TA sis/dia</th>
              <th class="border border-gray-200 px-2 py-1 text-left">IMC</th>
              <th class="border border-gray-200 px-2 py-1 text-left">Glucosa</th>
              <th class="border border-gray-200 px-2 py-1 text-left">HbA1c</th>
              <th class="border border-gray-200 px-2 py-1 text-left">Riesgo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in fm.eventosConcentrados || []" :key="idx" class="odd:bg-white even:bg-gray-50">
              <td class="border border-gray-200 px-2 py-1">
                {{ row.fechaControl ? formatDateDDMMYYYY(row.fechaControl) : texto(row.idEventoOriginal) }}
              </td>
              <td class="border border-gray-200 px-2 py-1">
                {{
                  row.signosVitales?.tensionArterialSistolica != null &&
                  row.signosVitales?.tensionArterialDiastolica != null
                    ? `${row.signosVitales.tensionArterialSistolica}/${row.signosVitales.tensionArterialDiastolica}`
                    : '—'
                }}
              </td>
              <td class="border border-gray-200 px-2 py-1">
                {{ row.somatometria?.indiceMasaCorporal != null ? row.somatometria.indiceMasaCorporal : '—' }}
              </td>
              <td class="border border-gray-200 px-2 py-1">
                {{ row.laboratorio?.glucosaMgDl != null ? row.laboratorio.glucosaMgDl : '—' }}
              </td>
              <td class="border border-gray-200 px-2 py-1">
                {{ row.laboratorio?.hba1cPorcentaje != null ? row.laboratorio.hba1cPorcentaje : '—' }}
              </td>
              <td class="border border-gray-200 px-2 py-1">{{ texto(row.riesgoActual) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="(fm.seguimientosProgramadosConcentrados || []).length" class="mt-3 overflow-x-auto">
        <p class="text-xs font-medium text-gray-600 mb-1">Seguimientos programados</p>
        <table class="min-w-full text-xs border-collapse border border-gray-200">
          <thead>
            <tr class="bg-gray-50">
              <th class="border border-gray-200 px-2 py-1 text-left">Programada</th>
              <th class="border border-gray-200 px-2 py-1 text-left">Motivo</th>
              <th class="border border-gray-200 px-2 py-1 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in fm.seguimientosProgramadosConcentrados || []" :key="idx">
              <td class="border border-gray-200 px-2 py-1">
                {{ row.fechaProgramada ? formatDateDDMMYYYY(row.fechaProgramada) : '—' }}
              </td>
              <td class="border border-gray-200 px-2 py-1">{{ texto(row.motivo) }}</td>
              <td class="border border-gray-200 px-2 py-1">{{ texto(row.estado) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Continuidad del seguimiento (discreto) -->
    <div
      class="w-full border border-dashed border-gray-300 rounded-md p-3 text-sm text-gray-700"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
      @click="goToStep(2)"
    >
      <h3 class="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Continuidad del seguimiento</h3>
      <div v-if="fm.porcentajeAsistencia != null || fm.numeroSeguimientosRealizados != null" class="space-y-1 text-xs sm:text-sm">
        <p v-if="fm.porcentajeAsistencia != null">
          <span class="text-gray-500">% asistencia (citas cerradas):</span> {{ texto(fm.porcentajeAsistencia) }}%
        </p>
        <p v-if="fm.numeroSeguimientosRealizados != null">
          <span class="text-gray-500">Realizadas / inasistencias / cancelaciones / reprogramaciones:</span>
          {{ texto(fm.numeroSeguimientosRealizados) }} / {{ texto(fm.numeroInasistencias) }} /
          {{ texto(fm.numeroCancelaciones) }} / {{ texto(fm.numeroReprogramaciones) }}
        </p>
      </div>
      <p v-else class="text-xs text-gray-500">Sin métricas operativas registradas.</p>
    </div>

    <!-- Recomendaciones y limitaciones finales -->
    <div
      class="w-full border border-gray-200 rounded-md p-3 cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
      @click="goToStep(2)"
    >
      <h3 class="text-sm font-semibold text-gray-800 mb-2">Cierre clínico</h3>
      <div v-if="fm.recomendaciones" class="mt-2">
        <p class="text-xs font-medium text-gray-600 mb-1">Recomendaciones</p>
        <p class="text-sm whitespace-pre-wrap">{{ fm.recomendaciones }}</p>
      </div>
      <div v-if="fm.limitaciones" class="mt-3">
        <p class="text-xs font-medium text-gray-600 mb-1">Limitaciones del informe</p>
        <p class="text-sm whitespace-pre-wrap">{{ fm.limitaciones }}</p>
      </div>
      <p v-if="!fm.recomendaciones && !fm.limitaciones" class="text-xs text-gray-500 italic">
        Sin recomendaciones ni limitaciones finales capturadas.
      </p>
    </div>

    <!-- Limitaciones de interpretación -->
    <div
      v-if="(fm.datosFaltantesRelevantes || []).length"
      class="w-full border border-amber-100 bg-amber-50/40 rounded-md p-3"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
      @click="goToStep(2)"
    >
      <h3 class="text-sm font-semibold text-amber-950 mb-2">Limitaciones de interpretación</h3>
      <ul class="list-disc list-inside text-sm text-gray-800">
        <li v-for="(d, i) in fm.datosFaltantesRelevantes" :key="i">{{ d }}</li>
      </ul>
    </div>

    <!-- Borrador automático (colapsado) -->
    <details v-if="hayBorradorAutomatico" class="w-full border border-dashed border-amber-200 rounded-md bg-amber-50/30">
      <summary class="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-amber-900">
        Borrador automático (no validado)
      </summary>
      <div class="px-3 pb-3 space-y-3 border-t border-amber-100 pt-2 text-sm">
        <div v-if="fm.resumenLongitudinalSugerido">
          <p class="text-xs text-gray-500">Resumen sugerido</p>
          <p class="whitespace-pre-wrap text-gray-800">{{ fm.resumenLongitudinalSugerido }}</p>
        </div>
        <div v-if="fm.conclusionClinicaSugerida">
          <p class="text-xs text-gray-500">Conclusión sugerida</p>
          <p class="whitespace-pre-wrap text-gray-800">{{ fm.conclusionClinicaSugerida }}</p>
        </div>
        <div v-if="fm.recomendacionesSugeridas">
          <p class="text-xs text-gray-500">Recomendaciones sugeridas</p>
          <p class="whitespace-pre-wrap text-gray-800">{{ fm.recomendacionesSugeridas }}</p>
        </div>
        <div v-if="fm.limitacionesSugeridas">
          <p class="text-xs text-gray-500">Limitaciones sugeridas</p>
          <p class="whitespace-pre-wrap text-gray-800">{{ fm.limitacionesSugeridas }}</p>
        </div>
      </div>
    </details>

    <!-- Gráficas (referencia; sin render) -->
    <div
      v-if="(fm.graficasIncluidas || []).length"
      class="w-full text-xs text-gray-500 border-t border-gray-100 pt-2"
      :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded': steps.currentStep === 2 }"
      @click="goToStep(2)"
    >
      <span class="font-medium text-gray-600">Gráficas previstas (sin vista en pantalla):</span>
      {{ (fm.graficasIncluidas || []).join(', ') }}
    </div>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
