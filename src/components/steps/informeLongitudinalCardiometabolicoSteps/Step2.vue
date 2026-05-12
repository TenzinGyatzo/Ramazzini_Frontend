<script setup>
import { computed, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { aplicarIteracionDosAlFormulario } from '@/helpers/informeLongitudinalOperativo';
import {
  GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA,
  NIVEL_RIESGO_LONGITUDINAL,
  CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL,
} from '@/helpers/informeLongitudinalCardiometabolicoOptions';

const store = useFormDataStore();

const fm = computed(() => store.formDataInformeLongitudinalCardiometabolico);

const opcionesConsistencia = CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL.map((v) => ({ label: v, value: v }));
const opcionesRiesgo = NIVEL_RIESGO_LONGITUDINAL.map((v) => ({ label: v, value: v }));

const riesgoLongitudinalLegible = computed(() => {
  const v = fm.value.nivelRiesgoLongitudinal;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
});

const textoFactoresPersistentes = computed({
  get() {
    const arr = fm.value.factoresPersistentes;
    if (!Array.isArray(arr)) return '';
    return arr.join('\n');
  },
  set(s) {
    const lines = String(s || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    fm.value.factoresPersistentes = lines.length ? lines : undefined;
  },
});

const textoAlertas = computed({
  get() {
    const arr = fm.value.alertasRelevantes;
    if (!Array.isArray(arr)) return '';
    return arr.join('\n');
  },
  set(s) {
    const lines = String(s || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    fm.value.alertasRelevantes = lines.length ? lines : undefined;
  },
});

const textoDatosFaltantes = computed({
  get() {
    const arr = fm.value.datosFaltantesRelevantes;
    if (!Array.isArray(arr)) return '';
    return arr.join('\n');
  },
  set(s) {
    const lines = String(s || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    fm.value.datosFaltantesRelevantes = lines.length ? lines : undefined;
  },
});

function toggleGrafica(val, checked) {
  const cur = Array.isArray(fm.value.graficasIncluidas) ? [...fm.value.graficasIncluidas] : [];
  if (checked) {
    if (!cur.includes(val)) cur.push(val);
  } else {
    const i = cur.indexOf(val);
    if (i >= 0) cur.splice(i, 1);
  }
  fm.value.graficasIncluidas = cur.length ? cur : undefined;
}

function isGraficaChecked(val) {
  return Array.isArray(fm.value.graficasIncluidas) && fm.value.graficasIncluidas.includes(val);
}

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

/** Evolución principal: TA (sist + diast), peso, IMC, glucosa, HbA1c — sin lípidos. */
const resumenIndicadoresResumen = computed(() => {
  const r = fm.value.resumenIndicadores;
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
  const rc = fm.value.resumenCondiciones;
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

/**
 * Recalcula métricas, sugeridos, indicadores y limitaciones de interpretación desde paso 1.
 * No modifica textos clínicos finales hasta que el usuario use «Copiar» en el borrador.
 */
function recalcularMetricasYSugerencias() {
  aplicarIteracionDosAlFormulario(store.formDataInformeLongitudinalCardiometabolico, {
    aplicarInterpretacionInferidaSiVacio: true,
    prellenarGraficasSiVacio: false,
    recalcDatosFaltantes: true,
  });
}

function copiarSugerido(campoSugerido, campoFinal) {
  const fd = store.formDataInformeLongitudinalCardiometabolico;
  const s = fd[campoSugerido];
  if (typeof s === 'string' && s.trim() !== '') fd[campoFinal] = s;
}

onMounted(() => {
  if (fm.value.consistenciaSeguimiento === '') fm.value.consistenciaSeguimiento = undefined;
  if (fm.value.nivelRiesgoLongitudinal === '') fm.value.nivelRiesgoLongitudinal = undefined;

  const id = fm.value._id;
  const esDocumentoPersistente = id != null && String(id).trim() !== '';
  if (esDocumentoPersistente) return;

  const yaHayBorrador =
    typeof fm.value.resumenLongitudinalSugerido === 'string' && fm.value.resumenLongitudinalSugerido.trim() !== '';
  if (!yaHayBorrador) {
    recalcularMetricasYSugerencias();
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Interpretación y cierre</h1>
    <p class="text-sm text-gray-600 mb-4">
      Primero la síntesis clínica y el riesgo; después la evolución en pocos indicadores y el contexto operativo. El borrador automático no sustituye el texto validado por el médico.
    </p>

    <div class="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
        @click="recalcularMetricasYSugerencias"
      >
        Recalcular métricas y sugerencias
      </button>
      <span class="text-xs text-gray-600 max-w-xl">
        Usa eventos y seguimientos del paso 1. Actualiza sugerencias y «limitaciones de interpretación» automáticas; no sobrescribe conclusión, resumen, recomendaciones ni limitaciones finales hasta que usted copie desde el borrador.
      </span>
    </div>

    <div class="space-y-10">
      <!-- Capa 1: interpretación clínica -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1">Interpretación clínica</h2>

        <div class="rounded-lg border-2 border-rose-200 bg-rose-50/80 px-4 py-3 shadow-sm max-w-4xl">
          <p class="text-xs font-medium uppercase tracking-wide text-rose-900/80">Riesgo longitudinal</p>
          <p class="text-2xl sm:text-3xl font-bold text-rose-950 mt-1">{{ riesgoLongitudinalLegible }}</p>
          <div class="mt-3 max-w-md">
            <FormKit
              type="select"
              name="nivelRiesgoLongitudinal"
              label="Ajustar nivel (edición)"
              :options="[{ label: '—', value: '' }, ...opcionesRiesgo]"
              v-model="store.formDataInformeLongitudinalCardiometabolico.nivelRiesgoLongitudinal"
            />
          </div>
        </div>

        <div class="max-w-4xl space-y-4">
          <FormKit
            type="textarea"
            rows="3"
            label="Conclusión clínica"
            name="conclusionClinica"
            v-model="store.formDataInformeLongitudinalCardiometabolico.conclusionClinica"
          />
          <FormKit
            type="textarea"
            rows="4"
            label="Resumen longitudinal"
            name="resumenLongitudinal"
            v-model="store.formDataInformeLongitudinalCardiometabolico.resumenLongitudinal"
          />
          <FormKit
            type="textarea"
            name="interpretacionRiesgoLongitudinal"
            label="Interpretación del riesgo longitudinal"
            rows="4"
            v-model="store.formDataInformeLongitudinalCardiometabolico.interpretacionRiesgoLongitudinal"
          />
          <FormKit type="textarea" rows="4" label="Factores persistentes (una línea por elemento)" v-model="textoFactoresPersistentes" />
          <FormKit type="textarea" rows="4" label="Alertas relevantes (una línea por elemento)" v-model="textoAlertas" />
          <FormKit
            type="select"
            name="consistenciaSeguimiento"
            label="Consistencia del seguimiento"
            :options="[{ label: '—', value: '' }, ...opcionesConsistencia]"
            v-model="store.formDataInformeLongitudinalCardiometabolico.consistenciaSeguimiento"
          />
        </div>
      </section>

      <!-- Capa 2: evolución principal -->
      <section v-if="resumenIndicadoresResumen.length" class="space-y-2">
        <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1">Evolución principal</h2>
        <p class="text-xs text-gray-500">Solo TA, peso, IMC, glucosa y HbA1c; tendencia con al menos dos mediciones en el periodo.</p>
        <ul class="text-sm space-y-2 border border-gray-200 rounded-md p-4 bg-slate-50 max-w-4xl">
          <li v-for="(row, i) in resumenIndicadoresResumen" :key="i">
            <span class="font-medium text-gray-800">{{ row.label }}:</span>
            <span class="text-gray-700">{{ row.texto }}</span>
          </li>
        </ul>
      </section>

      <!-- Estado por condición -->
      <section v-if="resumenCondicionesBloques.length" class="space-y-2">
        <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1">Estado por condición</h2>
        <ul class="text-sm space-y-2 max-w-4xl">
          <li v-for="(b, i) in resumenCondicionesBloques" :key="i" class="border border-gray-100 rounded p-2 bg-white">
            <span class="font-medium text-gray-800">{{ b.titulo }}:</span>
            {{ b.texto }}
          </li>
        </ul>
      </section>

      <!-- Continuidad operativa (discreta) -->
      <section class="space-y-3 opacity-95">
        <h2 class="text-base font-medium text-gray-700 border-b border-dashed border-gray-300 pb-1">
          Continuidad del seguimiento (métricas operativas)
        </h2>
        <p class="text-xs text-gray-500">Conteos automáticos; ajuste solo si el criterio clínico difiere.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl text-sm">
          <FormKit type="number" label="Seguimientos incluidos" v-model.number="store.formDataInformeLongitudinalCardiometabolico.numeroSeguimientosProgramados" />
          <FormKit type="number" label="Seguimientos realizados" v-model.number="store.formDataInformeLongitudinalCardiometabolico.numeroSeguimientosRealizados" />
          <FormKit type="number" label="Inasistencias" v-model.number="store.formDataInformeLongitudinalCardiometabolico.numeroInasistencias" />
          <FormKit type="number" label="Cancelaciones" v-model.number="store.formDataInformeLongitudinalCardiometabolico.numeroCancelaciones" />
          <FormKit type="number" label="Reprogramaciones (en registro)" v-model.number="store.formDataInformeLongitudinalCardiometabolico.numeroReprogramaciones" />
          <FormKit type="number" step="any" min="0" max="100" label="% asistencia (citas cerradas)" v-model.number="store.formDataInformeLongitudinalCardiometabolico.porcentajeAsistencia" />
          <FormKit type="number" label="Eventos válidos (datos estructurados)" v-model.number="store.formDataInformeLongitudinalCardiometabolico.numeroEventosValidos" />
        </div>
      </section>

      <!-- Recomendaciones y limitaciones finales -->
      <section class="space-y-4 max-w-4xl">
        <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1">Cierre clínico</h2>
        <FormKit
          type="textarea"
          rows="3"
          label="Recomendaciones"
          name="recomendaciones"
          v-model="store.formDataInformeLongitudinalCardiometabolico.recomendaciones"
        />
        <FormKit
          type="textarea"
          rows="2"
          label="Limitaciones del informe"
          name="limitaciones"
          v-model="store.formDataInformeLongitudinalCardiometabolico.limitaciones"
        />
      </section>

      <!-- Limitaciones de interpretación -->
      <section class="max-w-4xl space-y-2">
        <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1">Limitaciones de interpretación</h2>
        <p class="text-xs text-gray-500">
          Lo que acota la lectura longitudinal (datos insuficientes, huecos en laboratorio o continuidad). Se regenera al recalcular; puede editar línea a línea.
        </p>
        <FormKit type="textarea" rows="5" label="Lista (una línea por elemento)" v-model="textoDatosFaltantes" />
      </section>

      <!-- Gráficas (referencia futura PDF; sin preview en pantalla) -->
      <section class="max-w-4xl space-y-2 text-sm text-gray-600">
        <h2 class="text-base font-medium text-gray-700">Gráficas previstas en informe (sin vista previa)</h2>
        <p class="text-xs text-gray-500">
          Solo referencia para generación futura de PDF; no se renderizan gráficos aquí. «Lípidos» es opcional y puede saturar el documento.
        </p>
        <ul class="space-y-2">
          <li v-for="g in GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA" :key="g" class="flex items-center gap-2">
            <input
              type="checkbox"
              :id="`graf-${g}`"
              :checked="isGraficaChecked(g)"
              @change="toggleGrafica(g, $event.target.checked)"
            />
            <label :for="`graf-${g}`" class="cursor-pointer">{{ g }}</label>
          </li>
        </ul>
      </section>

      <!-- Borrador automático (colapsado por defecto) -->
      <details class="max-w-4xl border border-dashed border-amber-300 rounded-lg bg-amber-50/40">
        <summary class="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-amber-950">
          Borrador automático (texto sugerido; no es el informe validado hasta copiar)
        </summary>
        <div class="px-4 pb-4 space-y-4 border-t border-amber-200/80 pt-3">
          <div class="space-y-2">
            <div class="flex justify-between items-center gap-2 flex-wrap">
              <label class="text-sm font-medium text-gray-700">Resumen longitudinal sugerido</label>
              <button
                type="button"
                class="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-white"
                @click="copiarSugerido('resumenLongitudinalSugerido', 'resumenLongitudinal')"
              >
                Copiar al campo final
              </button>
            </div>
            <textarea
              readonly
              rows="4"
              class="w-full text-sm border border-gray-200 rounded-md p-2 bg-white"
              :value="store.formDataInformeLongitudinalCardiometabolico.resumenLongitudinalSugerido || ''"
            />
          </div>
          <div class="space-y-2">
            <div class="flex justify-between items-center gap-2 flex-wrap">
              <label class="text-sm font-medium text-gray-700">Conclusión clínica sugerida</label>
              <button
                type="button"
                class="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-white"
                @click="copiarSugerido('conclusionClinicaSugerida', 'conclusionClinica')"
              >
                Copiar al campo final
              </button>
            </div>
            <textarea
              readonly
              rows="3"
              class="w-full text-sm border border-gray-200 rounded-md p-2 bg-white"
              :value="store.formDataInformeLongitudinalCardiometabolico.conclusionClinicaSugerida || ''"
            />
          </div>
          <div class="space-y-2">
            <div class="flex justify-between items-center gap-2 flex-wrap">
              <label class="text-sm font-medium text-gray-700">Recomendaciones sugeridas</label>
              <button
                type="button"
                class="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-white"
                @click="copiarSugerido('recomendacionesSugeridas', 'recomendaciones')"
              >
                Copiar al campo final
              </button>
            </div>
            <textarea
              readonly
              rows="3"
              class="w-full text-sm border border-gray-200 rounded-md p-2 bg-white"
              :value="store.formDataInformeLongitudinalCardiometabolico.recomendacionesSugeridas || ''"
            />
          </div>
          <div class="space-y-2">
            <div class="flex justify-between items-center gap-2 flex-wrap">
              <label class="text-sm font-medium text-gray-700">Limitaciones sugeridas</label>
              <button
                type="button"
                class="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-white"
                @click="copiarSugerido('limitacionesSugeridas', 'limitaciones')"
              >
                Copiar al campo final
              </button>
            </div>
            <textarea
              readonly
              rows="2"
              class="w-full text-sm border border-gray-200 rounded-md p-2 bg-white"
              :value="store.formDataInformeLongitudinalCardiometabolico.limitacionesSugeridas || ''"
            />
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
